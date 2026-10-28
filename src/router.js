import { createRouter, createWebHashHistory } from 'vue-router'

const titles = {
  home: 'Bug or Bluff? 👻 Frontend Queens',
  host: 'Host dashboard · Bug or Bluff?',
  join: 'Join the game · Bug or Bluff?',
  play: 'Playing · Bug or Bluff?'
}

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/host', name: 'host', component: () => import('./views/HostView.vue') },
    { path: '/join/:roomCode', name: 'join', component: () => import('./views/JoinView.vue'), props: true },
    { path: '/play/:roomCode', name: 'play', component: () => import('./views/PlayView.vue'), props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior: () => ({ top: 0 })
})

router.afterEach((to) => {
  document.title = titles[to.name] || titles.home
})

export default router
