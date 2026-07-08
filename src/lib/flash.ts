import { toast } from "sonner";

/**
 * Tone-aware toast emitter shared by the admin console and the buyer portal.
 *
 * `flash(msg)` confirms a successful action (success styling). `flash.error`
 * reports a failure or validation problem, and `flash.info` shows a neutral
 * notice. Successes and errors are surfaced the same, consistent way so a user
 * can always tell a completed action from a problem at a glance.
 */
export type Flash = ((message: string) => void) & {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

export const flash: Flash = Object.assign((message: string) => toast.success(message), {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message),
});
