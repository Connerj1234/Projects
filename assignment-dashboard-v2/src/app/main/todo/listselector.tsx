'use client'

export default function ListSelector() {
  return (
    <div className="w-48">
      <select className="w-full p-2 rounded-md bg-zinc-800 text-white">
        <option value="default">All Lists</option>
        <option value="personal">Personal</option>
        <option value="school">School</option>
      </select>
    </div>
  )
}
