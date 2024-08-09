import { Cog } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export const Toolbar = () => {
  return (
    <aside className="fixed h-full w-16 bg-gradient-to-b from-gray-800 to-gray-900 items-center shadow-lg flex flex-col justify-between py-4 px-2 border-r border-gray-700">
      <div className="flex flex-col items-center space-y-4"></div>
      <div>
        <NavLink to="/node-settings">
          <Cog color="grey" size={36} />
        </NavLink>
      </div>
    </aside>
  )
}
