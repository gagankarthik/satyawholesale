"use client";

import { CONTACT } from "@/lib/store";
import { Phone, Mail, Clock } from "@/components/Icons";

export default function ContactBar() {
  return (
    <div className="contactbar">
      <div className="wrap contactbar-in">
        <a href={CONTACT.phoneHref}><Phone /> {CONTACT.phone}</a>
        <a href={`mailto:${CONTACT.email}`}><Mail /> {CONTACT.email}</a>
        <span><Clock /> {CONTACT.hours}</span>
        <span className="right"><i /> 21+ only · Sales comply with state &amp; federal law</span>
      </div>
    </div>
  );
}
