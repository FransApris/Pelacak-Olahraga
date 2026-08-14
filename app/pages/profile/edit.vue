<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

const auth = useAuth()
const router = useRouter()

const isLoading = ref(false)
const form = ref({
  name: '',
  bio: '',
  profilePicture: ''
})

const fileInput = ref<HTMLInputElement | null>(null)
const previewImage = ref<string | null>(null)

// Inisialisasi form dengan data user saat ini
onMounted(() => {
  if (!auth.isAuthenticated.value) {
    router.push('/login')
    return
  }
  
  if (auth.user.value) {
    form.value.name = auth.user.value.name || ''
    form.value.bio = auth.user.value.bio || ''
    form.value.profilePicture = auth.user.value.profilePicture || ''
    previewImage.value = auth.user.value.profilePicture || `https://ui-avatars.com/api/?name=${auth.user.value.name}&background=random`
  }
})

// Menghandle pemilihan gambar
const handleImageSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    
    // Validasi ukuran (maksimal 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      previewImage.value = result
      form.value.profilePicture = result
    }
    reader.readAsDataURL(file)
  }
}

const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const saveProfile = async () => {
  if (!auth.user.value?.id) return
  
  isLoading.value = true
  try {
    const res = await $fetch<any>(`/api/users/${auth.user.value.id}/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${auth.token.value}`
      },
      body: form.value
    })
    
    if (res.success) {
      // Update data di auth composable jika perlu
      // (Bisa memicu fetching ulang me.get.ts jika di-refresh, tapi sementara kita redirect)
      alert('Profil berhasil diperbarui!')
      
      // Tunggu sebentar lalu redirect ke profil
      setTimeout(() => {
        router.push(`/profile/${auth.user.value?.id}`)
        // Force refresh data di client side (opsional, tergantung implementasi useAuth)
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      }, 500)
    }
  } catch (error) {
    console.error('Failed to update profile', error)
    alert('Gagal memperbarui profil. Silakan coba lagi.')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#121212] pt-6 px-4 pb-24">
    <!-- HEADER -->
    <header class="mb-8 flex items-center">
      <button @click="router.back()" class="p-2 mr-2 -ml-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
      </button>
      <h1 class="text-2xl font-black text-white tracking-tight">Edit Profil</h1>
    </header>

    <div class="max-w-md mx-auto bg-[#1c1c1e] rounded-2xl border border-gray-800 p-6 shadow-xl">
      
      <!-- AVATAR UPLOAD -->
      <div class="flex flex-col items-center mb-8">
        <div class="relative group cursor-pointer" @click="triggerFileInput">
          <img :src="previewImage || 'https://ui-avatars.com/api/?name=User'" 
               class="w-24 h-24 rounded-full object-cover border-4 border-gray-800 group-hover:border-strava-orange transition-colors" />
          
          <div class="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </div>
        </div>
        <p class="text-xs text-gray-500 font-bold mt-3">Ketuk gambar untuk mengubah avatar</p>
        
        <input type="file" ref="fileInput" accept="image/jpeg, image/png, image/webp" class="hidden" @change="handleImageSelect" />
      </div>

      <!-- FORM FIELDS -->
      <div class="space-y-5">
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nama Lengkap</label>
          <input v-model="form.name" type="text" placeholder="Masukkan nama Anda" class="w-full bg-[#2c2c2e] text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-strava-orange transition-colors" />
        </div>
        
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bio / Tentang Saya</label>
          <textarea v-model="form.bio" placeholder="Tuliskan sedikit tentang diri Anda..." rows="3" class="w-full bg-[#2c2c2e] text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-strava-orange transition-colors resize-none"></textarea>
        </div>
      </div>

      <!-- BUTTONS -->
      <div class="mt-8">
        <button 
          @click="saveProfile" 
          :disabled="isLoading || !form.name"
          class="w-full bg-strava-orange hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(252,76,2,0.39)] transition-all flex justify-center items-center"
        >
          <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          {{ isLoading ? 'Menyimpan...' : 'Simpan Perubahan' }}
        </button>
      </div>
      
    </div>
  </div>
</template>
