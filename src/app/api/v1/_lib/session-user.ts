import type { AuthUser } from "@/lib/data/types";
import type { SessionUser } from "@/lib/types";

/**
 * Maps a store auth record to the client-facing SessionUser DTO.
 * Shared by every /api/v1/auth/* route that signs a user in or updates their
 * profile (login, register, OTP verify, Google, PATCH /auth/me) so the
 * response shape stays identical across providers.
 */
export function toSessionUser(user: AuthUser): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as SessionUser["role"],
    doctorSlug: user.doctorSlug,
    verificationStatus: user.verificationStatus,
    phone: user.phone,
    phoneVerified: user.phoneVerified,
    provider: user.provider,
    avatarUrl: user.avatarUrl,
  };
}
