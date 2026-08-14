export default defineEventHandler(async (event) => {
  // Verifikasi JWT token via event.context (dijaga oleh middleware auth)
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
    const { distance, duration, type, average_pace } = body

    if (!distance || !duration || !type) {
      throw createError({ statusCode: 400, statusMessage: 'Statistik aktivitas tidak lengkap.' })
    }

    // Bangun System Prompt
    const prompt = `Anda adalah seorang pelatih olahraga (Smart Coach) yang sangat antusias, suportif, dan ahli secara teknis.
Saya (pengguna) baru saja menyelesaikan aktivitas olahraga dengan rincian berikut:
- Tipe Olahraga: ${type}
- Jarak: ${distance} km
- Durasi: ${duration} menit
- Kecepatan Rata-rata (Pace): ${average_pace} /km

Tugas Anda:
Berikan evaluasi singkat dan bersahabat dalam 1 paragraf (MAKSIMAL 3 KALIMAT). 
Berikan pujian yang spesifik terhadap angka tersebut, lalu berikan 1 saran teknis singkat (misal tentang pernapasan, postur, hidrasi, atau pemulihan) yang relevan dengan metrik tersebut. Gunakan bahasa Indonesia santai namun profesional.`

    // Menggunakan AbortController untuk timeout (15 detik) agar server tidak hang
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    // Memanggil REST API native Gemini (tanpa SDK)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150, // Batasi panjang respon agar cepat
        }
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Gemini API Error:', errorData)
      throw new Error('Gagal menghubungi AI Coach dari Google.')
    }

    const data = await response.json()
    const aiMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Terus semangat berlatih! Anda luar biasa, pertahankan konsistensinya.'

    return {
      success: true,
      message: aiMessage
    }

  } catch (error: any) {
    console.error('Coach API Error:', error)
    if (error.name === 'AbortError') {
      throw createError({ statusCode: 504, statusMessage: 'AI Coach terlalu lama merespons (Timeout jaringan).' })
    }
    throw createError({ statusCode: 500, statusMessage: error.message || 'Internal server error' })
  }
})
