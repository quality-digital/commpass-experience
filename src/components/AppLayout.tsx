import { ReactNode } from "react";
import BottomNav from "./BottomNav";

type AppLayoutProps = {
  children: ReactNode;
  hideNav?: boolean;
};

const AppLayout = ({ children, hideNav = false }: AppLayoutProps) => (
  <div className="min-h-screen bg-background max-w-md mx-auto relative">
    <div className={hideNav ? "" : "pb-20"}>{children}</div>
    {!hideNav && <BottomNav />}
  </div>
);

export default AppLayout;
