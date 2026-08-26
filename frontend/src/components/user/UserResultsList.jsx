import React from "react"
import UserBox from "./UserBox"

export default function UserResultsList({ users, loading, onSaveUser, onDeleteUser, showActions = true, showRole = true, compact = false }) {
  const hasUsers = users.length > 0
  const sortedUsers = hasUsers ? [...users].sort((a, b) => String(a.id).localeCompare(String(b.id))) : []

  return (
    <div className={`${compact ? "mt-0" : "mt-6"} space-y-3`}>
      {!loading && !hasUsers && <p className="text-gray-600">No hay usuarios para mostrar.</p>}

      {hasUsers && (
        <div>
          {sortedUsers.map((user, index) => (
            <UserBox
              key={user.id}
              user={user}
              isAlternate={index % 2 === 1}
              onSave={(id, data) => onSaveUser && onSaveUser(id, data)}
              onDelete={() => onDeleteUser && onDeleteUser(user.id)}
              showActions={showActions}
              showRole={showRole}
            />
          ))}
        </div>
      )}
    </div>
  )
}
