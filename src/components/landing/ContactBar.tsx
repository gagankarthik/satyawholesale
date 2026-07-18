"use client";

import { CONTACT } from "@/lib/store";
import { Phone, Mail, Clock, Sparkles, Tag } from "lucide-react";

export default function ContactBar() {
  return (
    <div className="contactbar">
      <div className="wrap contactbar-in">
        <a href={CONTACT.phoneHref}><Phone strokeWidth={2} /> {CONTACT.phone}</a>
        <a href={`mailto:${CONTACT.email}`}><Mail strokeWidth={2} /> {CONTACT.email}</a>
        <span><Clock strokeWidth={2} /> {CONTACT.hours}</span>
        <span className="right">
          <span className="cb-hi na"><Sparkles strokeWidth={2} /> New arrivals</span>
          <span className="cb-hi bp"><Tag strokeWidth={2} /> Best prices</span>
        </span>
      </div>
    </div>
  );
}
