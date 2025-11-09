import { redirect } from "next/navigation";

export default function Home() {
  redirect("/trials"); // or "/auth/login" or "/admin/dashboard" depending on your app flow
}
