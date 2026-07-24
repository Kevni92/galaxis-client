import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    // Geschützte Startseite: erst nach serverseitig bestätigter Session erreichbar.
    meta: { requiresAuth: true },
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/AuthView.vue'),
  },
  {
    // Auffangroute; verhindert leere Ansichten bei unbekannten Pfaden.
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
