<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const isLoginMode = ref(true)
const router = useRouter()
const auth = useAuth()

const form = ref({
  name: '',
  email: '',
  password: ''
})

const isLoading = ref(false)
const errorMessage = ref('')

const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
  errorMessage.value = ''
}

const handleSubmit = async () => {
  errorMessage.value = ''
  isLoading.value = true
  
  try {
    const endpoint = isLoginMode.value ? '/api/auth/login' : '/api/auth/register'
    const body = isLoginMode.value 
      ? { email: form.value.email, password: form.value.password }
      : { email: form.value.email, password: form.value.password, name: form.value.name }

    const response = await $fetch<any>(endpoint, {
      method: 'POST',
      body
    })

    if (response.success && response.token) {
      // Simpan sesi ke composable / cookie
      auth.setToken(response.token, response.user)
      
      // Arahkan kembali ke halaman utama (feed)
      router.push('/')
    } else {
      errorMessage.value = 'Respon server tidak valid.'
    }
  } catch (error: any) {
    errorMessage.value = error.data?.statusMessage || error.message || 'Terjadi kesalahan jaringan atau kredensial salah.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <!-- Background subtle gradient pattern -->
  <div class="min-h-[90vh] flex items-center justify-center p-4 bg-linear-to-br from-gray-50 to-gray-100">
    <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100/50 overflow-hidden relative">
      
      <!-- Dekorasi Oranye -->
      <div class="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-orange-400 to-strava-orange"></div>

      <!-- HEADER -->
      <div class="px-6 py-10 text-center">
        <div class="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-orange-100 shadow-sm">
          <svg class="w-8 h-8 text-strava-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        </div>
        <h2 class="text-3xl font-black text-gray-900 tracking-tight">
          {{ isLoginMode ? 'Selamat Datang' : 'Mulai Petualangan' }}
        </h2>
        <p class="text-sm text-gray-500 mt-2.5 px-4 font-medium">
          {{ isLoginMode ? 'Masuk untuk memantau performa berlari dan melihat pembaruan teman.' : 'Daftar sekarang dan mulailah perjalanan sehat bersama komunitas.' }}
        </p>
      </div>

      <!-- FORM SECTION -->
      <div class="px-6 sm:px-10 pb-10">
        
        <!-- ERROR ALERT -->
        <div v-if="errorMessage" class="mb-6 bg-red-50 text-red-600 text-sm font-medium px-4 py-3 rounded-xl border border-red-100 flex items-start animate-pulse">
          <svg class="w-5 h-5 mr-2 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>{{ errorMessage }}</span>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- FIELD: NAME (Khusus Register) -->
          <div v-if="!isLoginMode" class="space-y-1">
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider">Nama Lengkap</label>
            <input 
              v-model="form.name" 
              type="text" 
              required 
              class="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-orange-200 focus:border-strava-orange outline-none transition-all text-gray-900 font-medium placeholder-gray-400"
              placeholder="Misal: Joko Kencang"
            />
          </div>

          <!-- FIELD: EMAIL -->
          <div class="space-y-1">
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider">Alamat Email</label>
            <input 
              v-model="form.email" 
              type="email" 
              required 
              class="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-orange-200 focus:border-strava-orange outline-none transition-all text-gray-900 font-medium placeholder-gray-400"
              placeholder="joko@olahraga.com"
            />
          </div>

          <!-- FIELD: PASSWORD -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider">Kata Sandi</label>
              <a v-if="isLoginMode" href="#" class="text-xs font-bold text-strava-orange hover:underline">Lupa?</a>
            </div>
            <input 
              v-model="form.password" 
              type="password" 
              required 
              class="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-orange-200 focus:border-strava-orange outline-none transition-all text-gray-900 font-medium placeholder-gray-400 tracking-widest"
              placeholder="••••••••"
            />
          </div>

          <!-- SUBMIT BUTTON -->
          <button 
            type="submit" 
            :disabled="isLoading"
            class="w-full mt-4 bg-gray-900 hover:bg-black text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-gray-900/20 transition-all flex items-center justify-center relative overflow-hidden group"
            :class="{'opacity-80 cursor-not-allowed': isLoading}"
          >
            <div class="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>{{ isLoginMode ? 'Masuk ke Dasbor' : 'Buat Akun Baru' }}</span>
          </button>
        </form>

        <!-- FOOTER TOGGLE -->
        <div class="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500 font-medium">
          {{ isLoginMode ? 'Atlet baru?' : 'Sudah jadi member?' }}
          <button @click="toggleMode" type="button" class="text-gray-900 hover:text-strava-orange font-bold ml-1 outline-none transition-colors">
            {{ isLoginMode ? 'Daftar sekarang' : 'Masuk di sini' }}
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
