import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { X, Bell, AlertTriangle, AlertOctagon, CheckCircle2, Cloud, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const { notifications, dismissNotification, clearAllNotifications } = useBudget();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 h-full shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Bütçe Bildirimleri
            </h3>
            {notifications.length > 0 && (
              <span className="text-[11px] font-mono px-1.5 py-0.2 bg-neutral-100 dark:bg-neutral-800 rounded font-semibold text-neutral-700 dark:text-neutral-300">
                {notifications.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="p-1.5 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                title="Tümünü Temizle"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-neutral-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2 opacity-60" />
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Yeni Bildirim Yok
              </p>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 max-w-[200px] mt-1">
                Tüm harcama limitleriniz ve bütçe hedefleriniz güvenli seviyede.
              </span>
            </div>
          ) : (
            notifications.map((notif) => {
              const isExceeded = notif.type === 'limit_exceeded';
              const isWarn = notif.type === 'limit_warning';
              const isGoal = notif.type === 'goal_reached';

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-xl border text-xs transition-all relative ${
                    isExceeded
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                      : isWarn
                      ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                      : isGoal
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                      : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <button
                    onClick={() => dismissNotification(notif.id)}
                    className="absolute top-2.5 right-2.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-start gap-2.5 pr-4">
                    <div className="mt-0.5">
                      {isExceeded ? (
                        <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      ) : isWarn ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : isGoal ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h5 className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {notif.title}
                      </h5>
                      <p className="text-neutral-600 dark:text-neutral-300 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-neutral-400 font-mono mt-1.5 block">
                        {new Date(notif.timestamp).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
