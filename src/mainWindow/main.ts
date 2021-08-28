import '@/mainWindow/plugins/recycleScroller'
import '@/mainWindow/plugins/vueBootstrap'
import '@/mainWindow/plugins/vueSliderBar'
import '@/mainWindow/plugins/toasted'
import '@/sass/global.sass'

import App from '@/mainWindow/App.vue'
import Vue from 'vue'
import router from '@/mainWindow/plugins/router'
import { store } from '@/mainWindow/store'

Vue.config.productionTip = false
export const bus = new Vue()

new Vue({
  components: { App },
  router,
  store,
  template: '<App/>',
}).$mount('#app')
