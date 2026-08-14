export const useAuth = () => {
  // 1. JWT Storage dengan useCookie (Aman dari serangan XSS dibandingkan localStorage)
  const token = useCookie<string | null>('auth_token', {
    maxAge: 60 * 60 * 24 * 7, // Kedaluwarsa dalam 7 Hari (dalam satuan detik)
    path: '/',
    sameSite: 'lax', // Proteksi CSRF
    secure: process.env.NODE_ENV === 'production' // Kirim via HTTPS jika di server production
  })

  // 2. Global State untuk menyimpan data profil pengguna yang sedang login
  // Gunakan useState agar data ini tersinkronisasi selama proses Server-Side Rendering (SSR)
  const user = useState<any>('auth_user', () => null)

  // 3. Status Terotentikasi (Computed)
  // Menghasilkan boolean true jika token terisi
  const isAuthenticated = computed(() => !!token.value)

  // 4. Fungsi Setter (Dipanggil setelah menerima response sukses dari endpoint /api/auth/login)
  const setToken = (newToken: string, userData: any) => {
    token.value = newToken
    user.value = userData
  }

  // Fetch data user jika token ada tetapi state user kosong (misal setelah refresh halaman)
  const initAuth = async () => {
    if (token.value && !user.value) {
      try {
        const response = await $fetch<any>('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token.value}`
          }
        })
        if (response.success && response.user) {
          user.value = response.user
        } else {
          logout() // Token tidak valid, logout
        }
      } catch (e) {
        logout()
      }
    }
  }

  // 5. Fungsi Keluar (Logout)
  const logout = () => {
    // Bersihkan cookie dan state memori
    token.value = null
    user.value = null
    
    // Tendang pengguna kembali ke halaman login (asumsi halamannya bernama /login)
    navigateTo('/login')
  }

  return {
    token,
    user,
    isAuthenticated,
    setToken,
    initAuth,
    logout
  }
}
