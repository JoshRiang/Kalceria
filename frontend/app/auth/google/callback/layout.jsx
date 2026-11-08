export const metadata = {
  title: "Connecting Google Account | Kalceria",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GoogleCallbackLayout({ children }) {
  return (
    <div className="min-h-screen w-full bg-transparent">
      {children}
    </div>
  );
}
