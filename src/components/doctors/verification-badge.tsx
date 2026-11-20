import { Badge } from "@/components/ui/badge";
import { Clock, ShieldCheck } from "lucide-react";

/**
 * Honest verification labeling (never show a misleading badge):
 * - VERIFIED               -> green "Verified" badge
 * - PENDING / UNDER_REVIEW -> amber outline "Verification Pending" badge
 * - anything else (REJECTED, MORE_INFO, unknown) -> renders nothing
 */
export function VerificationBadge({ status }: { status: string }) {
  if (status === "VERIFIED") {
    return (
      <Badge className="bg-success text-success-foreground hover:bg-success">
        <ShieldCheck aria-hidden="true" />
        Verified
      </Badge>
    );
  }

  if (status === "PENDING" || status === "UNDER_REVIEW") {
    return (
      <Badge variant="outline" className="border-warning/60 text-warning">
        <Clock aria-hidden="true" />
        Verification Pending
      </Badge>
    );
  }

  return null;
}

export default VerificationBadge;
