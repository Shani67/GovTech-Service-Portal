import { count } from "drizzle-orm";

import {
  changeStatus,
  createDraft,
  saveStep,
  submitApplication,
} from "@/lib/applications/repository";
import { hashPassword } from "@/lib/staff/auth";

import { staffUsers, type ApplicationStatus, type BusinessType } from "./schema";
import type { Db } from "./types";

export const demoStaff = [
  { email: "officer@council.example", name: "Kasun Fernando", role: "officer" as const },
  { email: "manager@council.example", name: "Dilani Jayasinghe", role: "manager" as const },
];

const businesses: [string, BusinessType, string, ApplicationStatus][] = [
  ["Ceylon Spice House", "retail", "Kandy", "submitted"],
  ["Galle Face Kottu Corner", "food", "Colombo", "in_review"],
  ["Lotus Hair Studio", "services", "Nugegoda", "approved"],
  ["Hill Country Tea Traders", "retail", "Nuwara Eliya", "more_info_required"],
  ["Batik by Malini", "home_based", "Matara", "submitted"],
  ["Lanka Cycle Repairs", "services", "Kurunegala", "rejected"],
  ["Coconut Grove Bakery", "food", "Negombo", "approved"],
  ["Kelani Woodworks", "manufacturing", "Kelaniya", "in_review"],
  ["Sunrise Mobile Shop", "retail", "Gampaha", "submitted"],
  ["Ayur Wellness Centre", "services", "Kalutara", "in_review"],
  ["Rice & Curry Express", "food", "Jaffna", "submitted"],
  ["Ruhuna Print Works", "manufacturing", "Galle", "approved"],
  ["Little Stars Tuition", "home_based", "Kurunegala", "more_info_required"],
  ["Pettah Textile Mart", "retail", "Colombo", "submitted"],
  ["Ocean Fresh Fish Stall", "food", "Trincomalee", "in_review"],
  ["Arugam Surf Rentals", "services", "Pottuvil", "approved"],
  ["Hettipola Handlooms", "manufacturing", "Hettipola", "submitted"],
  ["Mango Tree Café", "food", "Anuradhapura", "rejected"],
  ["Smart Fix Electronics", "services", "Ratnapura", "submitted"],
  ["Sigiriya Souvenirs", "retail", "Dambulla", "in_review"],
  ["Home Sweets by Nadeesha", "home_based", "Panadura", "submitted"],
  ["Badulla Hardware", "retail", "Badulla", "approved"],
];

const firstNames = [
  "Nimal",
  "Sanduni",
  "Ravi",
  "Fathima",
  "Tharindu",
  "Priya",
  "Arjun",
  "Ishara",
  "Kavindi",
  "Suresh",
  "Malini",
];
const lastNames = [
  "Perera",
  "Silva",
  "Fernando",
  "Rajapaksha",
  "Bandara",
  "Nadarajah",
  "Hassan",
  "Wijesinghe",
  "Dissanayake",
];

const notes: Partial<Record<ApplicationStatus, string>> = {
  more_info_required: "Please upload a copy of the lease or ownership deed for the premises.",
  rejected: "The premises are in a residential zone where this type of business is not permitted.",
  approved: "All checks complete. Your licence is valid for one year.",
};

/** Steps an application has to go through to reach each status. */
const path: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: [],
  submitted: [],
  in_review: ["in_review"],
  more_info_required: ["in_review", "more_info_required"],
  approved: ["in_review", "approved"],
  rejected: ["in_review", "rejected"],
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Seeds staff accounts and sample applications. Goes through the same repository functions
 * as the real app, so every sample has a valid reference and a complete audit trail.
 */
export async function seed(
  db: Db,
  { staffPassword, now = new Date() }: { staffPassword: string; now?: Date },
) {
  const [{ total }] = await db.select({ total: count() }).from(staffUsers);
  if (total > 0) return { skipped: true };

  const passwordHash = await hashPassword(staffPassword);
  const staff = await db
    .insert(staffUsers)
    .values(demoStaff.map((member) => ({ ...member, passwordHash })))
    .returning();
  const officer = { id: staff[0].id, role: "officer" as const };
  const manager = { id: staff[1].id, role: "manager" as const };

  for (const [index, [name, type, city, status]] of businesses.entries()) {
    const first = firstNames[index % firstNames.length];
    const last = lastNames[(index * 7) % lastNames.length];
    const id = await createDraft(db);
    await saveStep(db, id, "business", { businessName: name, businessType: type });
    await saveStep(db, id, "premises", {
      addressLine1: `${10 + index} Main Street`,
      addressLine2: "",
      city,
      postcode: String(10000 + index * 731).padStart(5, "0"),
      employees: String((index % 6) + 1),
    });
    await saveStep(db, id, "start-date", {
      startsOn: new Date(now.getTime() + (20 + index) * DAY).toISOString().slice(0, 10),
    });
    await saveStep(db, id, "your-details", {
      fullName: `${first} ${last}`,
      email: `${first}.${last}${index}@example.com`.toLowerCase(),
      phone: `07${String(10000000 + index * 1234567).slice(0, 8)}`,
      nicNumber: `${String(850000000 + index * 1111).slice(0, 9)}V`,
    });

    // Spread submissions over the last few weeks, oldest first.
    let at = new Date(now.getTime() - (businesses.length - index) * DAY);
    await submitApplication(db, id, at);

    let version = 2;
    for (const to of path[status]) {
      at = new Date(at.getTime() + 6 * 60 * 60 * 1000);
      const final = to === "approved" || to === "rejected";
      const result = await changeStatus(
        db,
        {
          applicationId: id,
          expectedVersion: version,
          to,
          staff: final ? manager : officer,
          note: notes[to],
        },
        at,
      );
      version = result.version;
    }
  }

  return { skipped: false, applications: businesses.length };
}
