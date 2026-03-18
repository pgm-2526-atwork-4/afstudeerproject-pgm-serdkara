import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'

interface NoticeDialogProps {
    isOpen: boolean
    title: string
    message: string
    onClose: () => void
    confirmText?: string
}

export function NoticeDialog({ isOpen, title, message, onClose, confirmText = 'OK' }: NoticeDialogProps) {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[110]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-sidebar border border-border p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-foreground">
                                    {title}
                                </Dialog.Title>
                                <div className="mt-3 text-sm text-muted-foreground whitespace-pre-line">{message}</div>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-lg border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer"
                                        onClick={onClose}
                                    >
                                        {confirmText}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
