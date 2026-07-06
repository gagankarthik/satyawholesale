"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";
import { CONTACT } from "@/lib/store";
import { useAddresses } from "@/lib/addresses";
import { Button } from "@/components/ui";

export default function PortalProfile() {
  const { store, email, isAdmin, signOut } = useSession();
  const { addresses } = useAddresses(store ?? email ?? "");
  const router = useRouter();

  return (
    <div className="od-cols rise-in">
      <div className="panel">
        <div className="panel-h"><h3>Account</h3><span className="hint">{isAdmin ? "Warehouse staff" : "Customer account"}</span></div>
        <div className="kvs">
          <div className="kv2"><span>Store</span><b>{store ?? "—"}</b></div>
          <div className="kv2"><span>Sign-in email</span><b>{email}</b></div>
          <div className="kv2"><span>Access</span><b>{isAdmin ? "Admin + ordering" : "Ordering"}</b></div>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          Need to change your store details, licenses or payment terms? Call the warehouse at {CONTACT.phone} and we&apos;ll update your customer account.
        </p>
        <Button variant="ghost" style={{ marginTop: 16 }} onClick={() => { signOut(); router.replace("/auth/login"); }}>Sign out</Button>
      </div>
      <aside className="od-side">
        <div className="panel">
          <div className="panel-h"><h3>Saved addresses</h3><Link href="/portal/addresses" className="linklike">Manage</Link></div>
          {addresses.length > 0 ? (
            addresses.map((a) => (
              <div className="addrbox" key={a.id}><div className="al">{a.label}</div><p>{a.addr}</p></div>
            ))
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>No saved addresses yet. <Link href="/portal/addresses" className="linklike">Add one</Link> for faster checkout.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
