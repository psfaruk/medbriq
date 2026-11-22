"use client";

import { useCallback, useState } from "react";
import {
  CreditCard,
  Banknote,
  RotateCcw,
  ReceiptText,
  Info,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api-client";
import {
  PageHeader,
  StatCard,
  SectionCard,
  LoadingCard,
  ErrorState,
  EmptyState,
  Money,
  fmtDateTime,
} from "@/components/app/shared/ui-kit";
import { MethodBadge, LedgerStatusBadge } from "../parts";
import type { PaymentLedgerItem, PaymentTotals } from "../types";
import { useAdminData, errMessage } from "../use-admin-data";
import { useToast } from "@/hooks/use-toast";

/**
 * Payments — the platform payment ledger (sandbox simulation).
 * Totals cards + transaction table with a refund action for SUCCEEDED
 * payments (POST /api/v2/admin/payments/refund → marks REFUNDED).
 */
export default function PaymentsSection() {
  const { toast } = useToast();
  const [target, setTarget] = useState<PaymentLedgerItem | null>(null);
  const [busy, setBusy] = useState(false);

  const loader = useCallback(
    () =>
      apiGet<{ items: PaymentLedgerItem[]; totals: PaymentTotals }>(
        "/api/v2/admin/payments"
      ),
    []
  );
  const { data, error, loading, reload } = useAdminData(loader);

  const submitRefund = async (payment: PaymentLedgerItem) => {
    setBusy(true);
    try {
      await apiPost("/api/v2/admin/payments/refund", {
        paymentId: payment.id,
      });
      toast({
        title: "Refund processed",
        description: `${payment.referenceCode} — ${payment.patientName} refunded in sandbox.`,
      });
      setTarget(null);
      reload();
    } catch (err) {
      toast({
        title: "Refund failed",
        description: errMessage(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const items = data?.items ?? [];
  const totals = data?.totals;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments"
        subtitle="Every booking payment on the platform, with sandbox refund controls."
      />

      {loading ? (
        <LoadingCard rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="Transactions"
              value={totals?.count ?? items.length}
              hint="All statuses"
              icon={<ReceiptText className="h-4 w-4" />}
              tone="primary"
            />
            <StatCard
              label="Succeeded volume"
              value={
                totals
                  ? `৳ ${Math.round(totals.succeededAmount).toLocaleString("en-US")}`
                  : "—"
              }
              hint="Captured payments"
              icon={<Banknote className="h-4 w-4" />}
              tone="success"
            />
            <StatCard
              label="Refunded volume"
              value={
                totals
                  ? `৳ ${Math.round(totals.refundedAmount).toLocaleString("en-US")}`
                  : "—"
              }
              hint="Returned to patients"
              icon={<RotateCcw className="h-4 w-4" />}
              tone="warning"
            />
          </div>

          <SectionCard
            title={`Payment ledger (${items.length})`}
            contentClassName="p-0"
          >
            {items.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="h-6 w-6" />}
                title="No payments yet"
                hint="Sandbox transactions appear here after a patient pays for a booking."
                className="m-4"
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-card hover:bg-card">
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Txn ref</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((p) => (
                        <TableRow key={p.id} className="text-sm">
                          <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                            {fmtDateTime(p.createdAt)}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-foreground">
                            {p.referenceCode}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {p.doctorName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {p.patientName}
                          </TableCell>
                          <TableCell>
                            <MethodBadge method={p.method} />
                          </TableCell>
                          <TableCell>
                            <Money
                              amount={p.amount}
                              currency={p.currency}
                              className="font-semibold"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {p.txnRef ?? "—"}
                          </TableCell>
                          <TableCell>
                            <LedgerStatusBadge status={p.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            {p.status === "SUCCEEDED" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => setTarget(p)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Refund
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile card list */}
                <ul className="space-y-3 p-4 md:hidden">
                  {items.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-2xl border border-border bg-background/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-xs font-semibold text-foreground">
                            {p.referenceCode}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {fmtDateTime(p.createdAt)}
                          </span>
                        </span>
                        <LedgerStatusBadge status={p.status} />
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <p>
                          <span className="text-foreground">{p.patientName}</span>{" "}
                          → {p.doctorName}
                        </p>
                        <p className="flex items-center gap-2">
                          <MethodBadge method={p.method} />
                          <Money
                            amount={p.amount}
                            currency={p.currency}
                            className="font-semibold text-foreground"
                          />
                        </p>
                        {p.txnRef ? (
                          <p className="font-mono">{p.txnRef}</p>
                        ) : null}
                      </div>
                      {p.status === "SUCCEEDED" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => setTarget(p)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Refund payment
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </SectionCard>

          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Sandbox payment simulation — no real money moves. Refunds mark the
            payment REFUNDED, update the appointment&apos;s payment status and
            are written to the audit trail.
          </p>
        </>
      )}

      {/* ── Refund confirmation ──────────────────────────────────── */}
      <AlertDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Refund {target?.referenceCode}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target ? (
                <>
                  {target.patientName} paid{" "}
                  <Money amount={target.amount} currency={target.currency} /> to{" "}
                  {target.doctorName} via {target.method}. The payment will be
                  marked refunded (sandbox) and the appointment&apos;s payment
                  status updated. This is audit-logged and cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                if (!target) return;
                e.preventDefault();
                void submitRefund(target);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              {busy ? "Processing…" : "Process refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
