import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import WebFont from 'webfontloader'

import { App } from './app'
import { Router } from './app/router'
import { store } from './app/store'

import './styles.css'

WebFont.load({
  google: {
    families: ['Mulish:400,500,600,700,800,900'],
  },
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Provider store={store}>
    <App>
      <Router />
    </App>
  </Provider>
)
