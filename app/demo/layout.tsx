import { DemoBar } from "@/components/demo/DemoBar";

export const metadata = {
  title: { default: "See RunLetter working", template: "%s · RunLetter demo" },
  description: "A walkthrough of RunLetter with invented creators and invented runners.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rl-demowrap">
      {children}
      <DemoBar />
    </div>
  );
}
