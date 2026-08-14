import jwt from 'jsonwebtoken'

export default defineEventHandler((event) => {
  // 1. Ekstrak jalur URL yang sedang diakses
  const url = getRequestURL(event).pathname

  // 2. Tentukan Rute yang perlu dilindungi (Protected Routes)
  // Kita ingin mencegat (intercept) semua request ke `/api/*` kecuali untuk proses otentikasi (login/register)
  if (url.startsWith('/api/') && !url.startsWith('/api/auth/')) {
    
    // 3. Ambil header Authorization dari request klien
    const authHeader = getHeader(event, 'Authorization')
    
    // 4. Validasi Keberadaan Token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: Missing or invalid token format. Use Bearer <token>'
      })
    }

    // 5. Ekstrak token dengan membuang kata "Bearer "
    const token = authHeader.split(' ')[1] as string
    const jwtSecret = (process.env.JWT_SECRET || 'rahasia_super_aman_123') as string

    try {
      // 6. Verifikasi Kriptografi Token
      const decoded = jwt.verify(token, jwtSecret)
      
      // 7. Jika lolos, simpan data (payload) dari token ke dalam context event
      // Agar route tujuan (seperti /api/activities) tahu persis siapa yang mengirim request
      event.context.user = decoded
    } catch (err: any) {
      // Token kedaluwarsa atau dimanipulasi orang tak bertanggung jawab
      throw createError({
        statusCode: 401,
        statusMessage: err.name === 'TokenExpiredError' 
          ? 'Unauthorized: Token has expired. Please login again.'
          : 'Unauthorized: Invalid token signature.'
      })
    }
  }
})
