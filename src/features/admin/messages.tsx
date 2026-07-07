"use client";

import { useState } from "react";
import { useMessages, type Message } from "@/lib/wms";
import { useConfirm } from "@/components/Confirm";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import { Mail, Phone, Arrow, Trash } from "@/components/Icons";
import { Head, timeAgo, type Flash } from "./shared";

/* Admin inbox for the public "Send us a message" contact form. */
export function MessagesTab({ flash }: { flash: Flash }) {
  const { messages, ready, error, refresh, update, remove } = useMessages();
  const confirm = useConfirm();
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = [...messages].sort((a, b) => b.created - a.created);
  const unread = messages.filter((m) => !m.read).length;

  const current = sorted.find((m) => m.id === openId) ?? null;

  const openMsg = (m: Message) => {
    setOpenId(m.id);
    if (!m.read) update(m.id, { read: true });
  };
  const markAllRead = () => {
    messages.filter((m) => !m.read).forEach((m) => update(m.id, { read: true }));
    flash("All messages marked read");
  };
  const del = async (m: Message) => {
    if (await confirm({ title: "Delete message?", message: `The message from ${m.name} will be removed.`, confirmLabel: "Delete", danger: true })) {
      remove(m.id);
      if (openId === m.id) setOpenId(null);
      flash("Message deleted");
    }
  };

  return (
    <>
      <Head title="Messages" sub={unread ? `${unread} unread · inquiries from the website contact form` : "Inquiries from the website contact form"}>
        {unread > 0 && <Button variant="ghost" size="sm" onClick={markAllRead}>Mark all read</Button>}
      </Head>

      {!ready ? (
        <div className="msglist">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={74} radius={12} />)}</div>
      ) : error && !messages.length ? (
        <EmptyState icon={<Mail />} title="Couldn't load messages" description="There was a problem loading the inbox." action={<Button variant="ghost" onClick={refresh}>Retry</Button>} />
      ) : sorted.length === 0 ? (
        <EmptyState icon={<Mail />} title="No messages yet" description="When a customer sends a message from the website contact form, it lands here." />
      ) : (
        <div className={`msgpane ${current ? "has-detail" : ""}`}>
          <div className="msgpane-list" role="listbox" aria-label="Messages">
            {sorted.map((m) => {
              const active = openId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`msgrow ${m.read ? "" : "unread"} ${active ? "active" : ""}`}
                  onClick={() => openMsg(m)}
                >
                  {!m.read && <span className="msgdot" aria-hidden="true" />}
                  <span className="msg-from">
                    <span className="msg-name">{m.name}{m.store ? <span className="msg-store"> · {m.store}</span> : null}</span>
                    <span className="msg-preview">{m.message}</span>
                  </span>
                  <span className="msg-time mono">{timeAgo(m.created)}</span>
                </button>
              );
            })}
          </div>

          <div className="msgpane-detail">
            {current ? (
              <article className="msgdetail" aria-label={`Message from ${current.name}`}>
                <button type="button" className="msgdetail-back" onClick={() => setOpenId(null)}>
                  <Arrow className="msgdetail-back-ic" /> Back to inbox
                </button>
                <header className="msgdetail-head">
                  <div>
                    <h3>{current.name}{current.store ? <span className="msg-store"> · {current.store}</span> : null}</h3>
                    <span className="msg-time mono">{timeAgo(current.created)}</span>
                  </div>
                </header>
                <p className="msg-full">{current.message}</p>
                <div className="msg-meta">
                  <a className="msg-contact" href={`mailto:${current.email}`}><Mail /> {current.email}</a>
                  {current.phone && <a className="msg-contact" href={`tel:${current.phone}`}><Phone /> {current.phone}</a>}
                </div>
                <div className="msg-actions">
                  <a className="btn btn-primary btn-sm" href={`mailto:${current.email}?subject=Re: your message to Satya Wholesale`}><Mail /> Reply by email</a>
                  <Button variant="ghost" size="sm" onClick={() => del(current)}><Trash /> Delete</Button>
                </div>
              </article>
            ) : (
              <div className="msgdetail-empty">
                <Mail />
                <p>Select a message to read it here.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
