import { BrowserRouter, Route } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Route path="/" element={<Layout}>
        <Route index element={<Public}/>
        <Route path="*" element={<NotFound}
      </Route>
    </BrowserRouter>
  )
}

export default App
