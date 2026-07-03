import ClienteForm from '../ClienteForm'

export default function NuevoClientePage() {
  return (
    <div className="p-6 max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Nuevo cliente</h1>
        <p className="text-gray-500 text-sm mt-1">Añade un nuevo cliente al almacén</p>
      </div>
      <ClienteForm />
    </div>
  )
}
