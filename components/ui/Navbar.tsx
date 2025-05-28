// components/Navbar.tsx
"use client";

import { UserButton, SignInButton, SignUpButton, useUser } from "@clerk/nextjs";

export default function Navbar() {
  const { isSignedIn, user } = useUser();

  return (
    <nav className="flex justify-between items-center p-4 bg-gray-800 text-white">
      <div className="text-xl font-bold">My App</div>
      <div className="flex items-center gap-4">
        {isSignedIn ? (
          <>
            <UserButton afterSignOutUrl="/" />
            <span>{user?.firstName}</span>
          </>
        ) : (
          <>
            <SignInButton mode="modal">
              <button className="bg-blue-500 px-4 py-2 rounded">Sign In</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="bg-green-500 px-4 py-2 rounded">Sign Up</button>
            </SignUpButton>
          </>
        )}
      </div>
    </nav>
  );
}