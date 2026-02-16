export default function WaitlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fixed inset-0 z-[200] bg-black !pt-0">{children}</div>;
}
