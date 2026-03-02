export default function WaitlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fixed inset-0 z-[200] bg-[#F7F3EA] overflow-y-auto !pt-0">{children}</div>;
}
