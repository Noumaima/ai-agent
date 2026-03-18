import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui"
import AppRouterProvider from "@/routes/app-router.provider"
import { AuthProvider } from "./modules/public"

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouterProvider />
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
