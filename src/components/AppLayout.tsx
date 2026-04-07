import { ReactNode } from "react";
import BottomNav from "./BottomNav";

const AppLayout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background max-w-md mx-auto relative">
    <div className="pb-20">{children}</div>
    <BottomNav />
  </div>
);

export default AppLayout;
