import { defineEventHandler, readMultipartFormData } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event)
    if (!formData) {
      throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
    }

    // Cari field bernama 'photo'
    const photoField = formData.find(field => field.name === 'photo')
    if (!photoField || !photoField.data) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid photo field' })
    }

    // Ambil API Key ImgBB dari Environment Variable
    const imgbbApiKey = process.env.IMGBB_API_KEY
    
    if (!imgbbApiKey) {
      console.warn('IMGBB_API_KEY is not set. Using local mock upload (NOT FOR PRODUCTION).')
      // Fallback for local development if key is missing (optional, but good for UX)
      return {
        success: true,
        url: `https://placehold.co/600x400/orange/white?text=ImgBB+Key+Missing`
      }
    }

    // Konversi buffer binary gambar ke Base64 string
    const base64Image = photoField.data.toString('base64')

    // Kirim request ke ImgBB API
    const response = await $fetch<any>(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
      method: 'POST',
      body: new URLSearchParams({
        image: base64Image
      })
    })

    if (response && response.success && response.data && response.data.url) {
      return {
        success: true,
        url: response.data.url
      }
    } else {
      throw new Error('Invalid response from ImgBB')
    }

  } catch (error: any) {
    console.error('Error uploading file to ImgBB:', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error during upload' })
  }
})
