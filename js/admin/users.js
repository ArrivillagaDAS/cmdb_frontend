import { initAdminShell, protectAdminPage } from "./admin-shell.js";

if (protectAdminPage()) initAdminShell("users");
