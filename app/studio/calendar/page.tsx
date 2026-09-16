// The studio calendar folded into Your week, which now carries the rail of weeks around this one.
import { redirect } from "next/navigation";

export default function StudioCalendar() {
  redirect("/studio/week");
}
