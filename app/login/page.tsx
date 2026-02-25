import LoginForm from "@/components/login-form"

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden">
      {/* Removed 'max-w-sm' and 'p-6' to allow the 
          LoginForm's internal layout to take over.
      */}
      <LoginForm />
    </main>
  )
}