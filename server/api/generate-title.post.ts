export default defineEventHandler(async (event) => {
  // Verifikasi JWT token
  const userContext = event.context.user
  if (!userContext) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'GANTI_DENGAN_API_KEY_ASLI_ANDA') {
    throw createError({ statusCode: 500, statusMessage: 'Kunci API Gemini belum dikonfigurasi di server.' })
  }

  try {
    const body = await readBody(event)
    const { distance, duration, type, timeOfDay } = body

    if (!distance || !duration || !type || !timeOfDay) {
      throw createError({ statusCode: 400, statusMessage: 'Statistik aktivitas tidak lengkap untuk generate judul.' })
    }

    // Bangun System Prompt
    const prompt = `Anda adalah asisten AI yang kreatif. 
Tugas Anda: Buat 1 judul aktivitas olahraga yang menarik, puitis, atau keren (Maksimal 6 kata) dalam bahasa Indonesia, berdasarkan data berikut:
- Tipe Olahraga: ${type}
- Jarak: ${distance} km
- Durasi: ${duration} menit
- Waktu: ${timeOfDay}

Hanya kembalikan string judulnya saja tanpa tanda kutip dan tanpa penjelasan tambahan. Hindari judul generik seperti "Lari Pagi" atau "Sepeda Sore". Buat sedikit lebih dramatis atau lucu.`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9, // Sedikit lebih tinggi untuk kreativitas
          maxOutputTokens: 30, // Sangat pendek (hanya untuk judul)
        }
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Gemini API Error (Title Generator):', errorData)
      throw new Error('Gagal menghasilkan judul dari AI.')
    }

    const data = await response.json()
    let aiTitle = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    
    // Hapus tanda kutip jika AI bandel menambahkannya
    aiTitle = aiTitle.replace(/^"|"$/g, '')
    
    if (!aiTitle) {
       aiTitle = `Petualangan ${type} ${timeOfDay}`
    }

    return {
      success: true,
      title: aiTitle
    }

  } catch (error: any) {
    console.error('Title API Error:', error)
    if (error.name === 'AbortError') {
      throw createError({ statusCode: 504, statusMessage: 'AI terlalu lama merespons.' })
    }
    throw createError({ statusCode: 500, statusMessage: error.message || 'Internal server error' })
  }
})
