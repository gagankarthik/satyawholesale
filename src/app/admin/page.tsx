import { redirect } from "next/navigation";

/* Orders is the warehouse team's priority landing surface. */
export default function AdminIndex() {
  redirect("/admin/orders");
}
