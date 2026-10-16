import './ui/theme.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { StorageProblem } from './app/StorageProblem'
import { checkStorage } from './app/storageCheck'

const root = createRoot(document.getElementById('root')!)
void checkStorage().then(status => {
  root.render(<StrictMode>{status === 'ok' ? <App /> : <StorageProblem />}</StrictMode>)
})
