"use client";

import { useRouter } from "next/navigation";
import { CUSTOMERS } from "@/lib/store";
import { useSession } from "@/lib/auth";
import { ADDRESSES } from "../meta";

export default function PortalProfile() {
  const me = CUSTOMERS[0];
  const { signOut } = useSession();
  const router = useRouter();

  return (
    <div className="od-cols">
      <div className="panel">
        <div className="panel-h"><h3>Account</h3><span className="hint">{me.id}</span></div>
        <div className="kvs">
          <div className="kv2"><span>Store</span><b>{me.store}</b></div>
          <div className="kv2"><span>Contact</span><b>{me.contact}</b></div>
          <div className="kv2"><span>Email</span><b>{me.email}</b></div>
          <div className="kv2"><span>Phone</span><b>{me.phone}</b></div>
          <div className="kv2"><span>Member since</span><b>{me.since}</b></div>
          <div className="kv2"><span>Terms</span><b>{me.terms}</b></div>
          <div className="kv2"><span>Business license</span><b className="mono">{me.businessLicense}</b></div>
          <div className="kv2"><span>Tobacco license</span><b className="mono">{me.tobaccoLicense}</b></div>
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => { signOut(); router.replace("/auth/login"); }}>Sign out</button>
      </div>
      <aside className="od-side">
        <div className="panel">
          <div className="panel-h"><h3>Saved addresses</h3></div>
          {ADDRESSES.map((a) => (
            <div className="addrbox" key={a.id}><div className="al">{a.label}</div><p>{a.addr}</p></div>
          ))}
        </div>
      </aside>
    </div>
  );
}
