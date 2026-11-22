// upload-guard.c — LD_PRELOAD interposer for the sandbox FUSE trap.
//
// /home/z/my-project/upload is a network FUSE mount that can hang forever.
// Any opendir()/stat() on it wedges the calling thread in D-state (unkillable).
// This interposer blocks ALL glibc-level access to that path prefix so any
// tree-walking library (watchpack, fdir/fast-glob, fs.readdir, Rust libc
// users, etc.) sees ENOENT instead of hanging.
//
// Build: gcc -shared -fPIC -O2 -o upload-guard.so upload-guard.c -ldl
// Use:   LD_PRELOAD=/path/upload-guard.so node ...
//
// FMD_UPLOAD_LOG=1 additionally logs every blocked call (stderr) so the
// offending walker can be identified.

#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <fcntl.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <dirent.h>
#include <unistd.h>

static const char *UPLOAD_PREFIX = "/home/z/my-project/upload";
static const size_t UPLOAD_PREFIX_LEN = sizeof("/home/z/my-project/upload") - 1; // 25

static int is_upload(const char *p) {
    if (!p) return 0;
    size_t n = strlen(p);
    if (n < UPLOAD_PREFIX_LEN) {
        // relative forms: "upload" or "upload/..." when cwd is the project root
        return (strncmp(p, "upload", 6) == 0 &&
                (p[6] == '\0' || p[6] == '/')) ? 2 : 0;
    }
    if (strncmp(p, UPLOAD_PREFIX, UPLOAD_PREFIX_LEN) != 0) return 0;
    return (n == UPLOAD_PREFIX_LEN || p[UPLOAD_PREFIX_LEN] == '/') ? 1 : 0;
}

static int log_enabled(void) {
    static int cached = -1;
    if (cached == -1) {
        const char *v = getenv("FMD_UPLOAD_LOG");
        cached = v ? (v[0] == '2' ? 2 : 1) : 0;
    }
    return cached;
}

static void log_diag(const char *fmt, int a, long b) {
    if (log_enabled() == 2) {
        fprintf(stderr, "[upload-guard] %s %d %ld pid=%d\n", fmt, a, b, (int)getpid());
        fflush(stderr);
    }
}

static void log_block(const char *fn, const char *p) {
    if (log_enabled()) {
        fprintf(stderr, "[upload-guard] BLOCKED %s(%s) pid=%d\n", fn, p, (int)getpid());
        fflush(stderr);
    }
}

typedef DIR *(*opendir_t)(const char *);
DIR *opendir(const char *name) {
    if (is_upload(name)) {
        log_block("opendir", name);
        errno = ENOENT;
        return NULL;
    }
    static opendir_t real;
    if (!real) real = (opendir_t)dlsym(RTLD_NEXT, "opendir");
    return real(name);
}

typedef DIR *(*opendir64_t)(const char *);
DIR *opendir64(const char *name) {
    if (is_upload(name)) {
        log_block("opendir64", name);
        errno = ENOENT;
        return NULL;
    }
    static opendir64_t real;
    if (!real) real = (opendir64_t)dlsym(RTLD_NEXT, "opendir64");
    return real(name);
}

typedef int (*openat_t)(int, const char *, int, ...);
int openat(int dirfd, const char *path, int flags, ...) {
    if (is_upload(path)) {
        log_block("openat", path);
        errno = ENOENT;
        return -1;
    }
    static openat_t real;
    if (!real) real = (openat_t)dlsym(RTLD_NEXT, "openat");
    mode_t mode = 0;
    if (flags & (O_CREAT | O_TMPFILE)) {
        va_list ap;
        va_start(ap, flags);
        mode = (mode_t)va_arg(ap, int);
        va_end(ap);
    }
    return real(dirfd, path, flags, mode);
}

typedef int (*open_t)(const char *, int, ...);
int open(const char *path, int flags, ...) {
    if (is_upload(path)) {
        log_block("open", path);
        errno = ENOENT;
        return -1;
    }
    static open_t real;
    if (!real) real = (open_t)dlsym(RTLD_NEXT, "open");
    mode_t mode = 0;
    if (flags & (O_CREAT | O_TMPFILE)) {
        va_list ap;
        va_start(ap, flags);
        mode = (mode_t)va_arg(ap, int);
        va_end(ap);
    }
    return real(path, flags, mode);
}

typedef int (*stat_t)(const char *, struct stat *);
int stat(const char *path, struct stat *st) {
    if (is_upload(path)) {
        log_block("stat", path);
        errno = ENOENT;
        return -1;
    }
    static stat_t real;
    if (!real) real = (stat_t)dlsym(RTLD_NEXT, "stat");
    return real(path, st);
}

typedef int (*lstat_t)(const char *, struct stat *);
int lstat(const char *path, struct stat *st) {
    if (is_upload(path)) {
        log_block("lstat", path);
        errno = ENOENT;
        return -1;
    }
    static lstat_t real;
    if (!real) real = (lstat_t)dlsym(RTLD_NEXT, "lstat");
    return real(path, st);
}

typedef int (*statx_t)(int, const char *, int, unsigned, struct statx *);
int statx(int dirfd, const char *path, int flags, unsigned mask, struct statx *stx) {
    if (is_upload(path)) {
        log_block("statx", path);
        errno = ENOENT;
        return -1;
    }
    static statx_t real;
    if (!real) real = (statx_t)dlsym(RTLD_NEXT, "statx");
    return real(dirfd, path, flags, mask, stx);
}

typedef int (*access_t)(const char *, int);
int access(const char *path, int mode) {
    if (is_upload(path)) {
        log_block("access", path);
        errno = ENOENT;
        return -1;
    }
    static access_t real;
    if (!real) real = (access_t)dlsym(RTLD_NEXT, "access");
    return real(path, mode);
}

// ── fd-based defenses ──────────────────────────────────────────────────────
// Node/libuv (and other libs) can call getdents64()/fdopendir() directly on
// fds opened through paths we did not see (raw syscalls, open64, ...).
// We resolve fd -> path via /proc/self/fd readlink, which never touches the
// hung FUSE mount itself (procfs resolves from the dentry cache).

static int fd_is_upload(int fd) {
    char link[64], target[4096];
    snprintf(link, sizeof(link), "/proc/self/fd/%d", fd);
    ssize_t n = readlink(link, target, sizeof(target) - 1);
    if (n <= 0) return 0;
    target[n] = '\0';
    return is_upload(target);
}

typedef DIR *(*fdopendir_t)(int);
DIR *fdopendir(int fd) {
    if (fd_is_upload(fd)) {
        log_block("fdopendir", "(fd)");
        errno = ENOENT;
        return NULL;
    }
    static fdopendir_t real;
    if (!real) real = (fdopendir_t)dlsym(RTLD_NEXT, "fdopendir");
    return real(fd);
}

typedef int (*open64_t)(const char *, int, ...);
int open64(const char *path, int flags, ...) {
    if (is_upload(path)) {
        log_block("open64", path);
        errno = ENOENT;
        return -1;
    }
    static open64_t real;
    if (!real) real = (open64_t)dlsym(RTLD_NEXT, "open64");
    mode_t mode = 0;
    if (flags & (O_CREAT | O_TMPFILE)) {
        va_list ap;
        va_start(ap, flags);
        mode = (mode_t)va_arg(ap, int);
        va_end(ap);
    }
    return real(path, flags, mode);
}

typedef int (*openat64_t)(int, const char *, int, ...);
int openat64(int dirfd, const char *path, int flags, ...) {
    if (is_upload(path)) {
        log_block("openat64", path);
        errno = ENOENT;
        return -1;
    }
    static openat64_t real;
    if (!real) real = (openat64_t)dlsym(RTLD_NEXT, "openat64");
    mode_t mode = 0;
    if (flags & (O_CREAT | O_TMPFILE)) {
        va_list ap;
        va_start(ap, flags);
        mode = (mode_t)va_arg(ap, int);
        va_end(ap);
    }
    return real(dirfd, path, flags, mode);
}

// glibc ≥ 2.30 exports getdents64. If callers use it directly (libuv's fast
// readdir path does), return EOF (0) so the directory reads as empty.
typedef ssize_t (*getdents64_t)(int, void *, size_t);
ssize_t getdents64(int fd, void *buf, size_t count) {
    if (fd_is_upload(fd)) {
        log_block("getdents64", "(fd)");
        return 0; // EOF: empty directory
    }
    static getdents64_t real;
    if (!real) real = (getdents64_t)dlsym(RTLD_NEXT, "getdents64");
    return real(fd, buf, count);
}

// glibc < 2.30: getdents (32-bit) — same treatment for completeness.
typedef ssize_t (*getdents_t)(unsigned, void *, size_t);
ssize_t getdents(unsigned fd, void *buf, size_t count) {
    if (fd_is_upload((int)fd)) {
        log_block("getdents", "(fd)");
        return 0;
    }
    static getdents_t real;
    if (!real) real = (getdents_t)dlsym(RTLD_NEXT, "getdents");
    return real(fd, buf, count);
}

// ── scandir: libuv's uv_fs_scandir (Node fs.readdirSync / fs.readdir) ──────
// glibc's scandir opens and reads the directory internally via hidden
// aliases, so opendir/getdents64 interposition never sees it. Interpose the
// entry point itself.
typedef int (*scandir_t)(const char *, struct dirent ***, int (*)(const struct dirent *), int (*)(const struct dirent **, const struct dirent **));
int scandir(const char *dirp, struct dirent ***namelist,
            int (*filter)(const struct dirent *),
            int (*compar)(const struct dirent **, const struct dirent **)) {
    if (is_upload(dirp)) {
        log_block("scandir", dirp);
        errno = ENOENT;
        return -1;
    }
    static scandir_t real;
    if (!real) real = (scandir_t)dlsym(RTLD_NEXT, "scandir");
    return real(dirp, namelist, filter, compar);
}

typedef int (*scandir64_t)(const char *, struct dirent64 ***, int (*)(const struct dirent64 *), int (*)(const struct dirent64 **, const struct dirent64 **));
int scandir64(const char *dirp, struct dirent64 ***namelist,
              int (*filter)(const struct dirent64 *),
              int (*compar)(const struct dirent64 **, const struct dirent64 **)) {
    if (is_upload(dirp)) {
        log_block("scandir64", dirp);
        errno = ENOENT;
        return -1;
    }
    static scandir64_t real;
    if (!real) real = (scandir64_t)dlsym(RTLD_NEXT, "scandir64");
    return real(dirp, namelist, filter, compar);
}

// ── The universal catch-all: glibc's syscall() trampoline ─────────────────
// libuv (Node fs) invokes raw syscalls through glibc's variadic syscall()
// helper (observed: PC inside libc while blocked on SYS_getdents64). This
// bypasses every per-function interposer above, so we interpose syscall()
// itself and neutralize the dangerous calls against the hung mount:
//   217 getdents64(fd, ...)            -> fd check (the actual hang)
//   257 openat(dirfd, path, ...)       -> path check
//   262 newfstatat(dirfd, path, ...)   -> path check
//   332 statx(dirfd, path, ...)        -> path check
//   269 faccessat(dirfd, path, ...)    -> path check
#include <sys/syscall.h>
#include <stdint.h>

typedef long (*syscall_t)(long, ...);

long syscall(long number, ...) {
    va_list ap;
    va_start(ap, number);
    long a1 = va_arg(ap, long);
    long a2 = va_arg(ap, long);
    long a3 = va_arg(ap, long);
    long a4 = va_arg(ap, long);
    long a5 = va_arg(ap, long);
    long a6 = va_arg(ap, long);
    va_end(ap);

    if (number == SYS_getdents64) {
        log_diag("getdents64 fd=", (int)a1, a2);
        if (fd_is_upload((int)a1)) {
            log_block("syscall(getdents64)", "(fd)");
            return 0; // EOF
        }
    } else if (number == SYS_openat || number == SYS_newfstatat ||
               number == SYS_statx || number == SYS_faccessat
#ifdef SYS_fstatat
               || number == SYS_fstatat
#endif
    ) {
        const char *pp = (const char *)(uintptr_t)a2;
        if (log_enabled() == 2) {
            fprintf(stderr, "[upload-guard] syscall %ld path=%s pid=%d\n", number,
                    (pp && (const char *)(uintptr_t)a2 == pp && pp[0]) ? pp : "(null)", (int)getpid());
            fflush(stderr);
        }
        // arg2 is the *path* for these calls (arg1 = dirfd)
        if (is_upload(pp)) {
            log_block("syscall", pp);
            errno = ENOENT;
            return -1;
        }
    }

    static syscall_t real;
    if (!real) real = (syscall_t)dlsym(RTLD_NEXT, "syscall");
    return real(number, a1, a2, a3, a4, a5, a6);
}
