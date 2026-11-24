import Link from "next/link";

import { signOutAction } from "@/app/staff/actions";
import type { StaffMember } from "@/lib/staff/auth";

export function StaffBar({ staff }: { staff: StaffMember }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
      <nav aria-label="Licensing team">
        <Link href="/staff" className="link font-bold">
          Applications
        </Link>
      </nav>
      <div className="flex flex-wrap items-center gap-4">
        <p>
          Signed in as <strong>{staff.name}</strong> ({staff.role})
        </p>
        <form action={signOutAction}>
          <button type="submit" className="btn btn-secondary btn-small">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
