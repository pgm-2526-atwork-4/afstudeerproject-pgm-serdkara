import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { Trash2 } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'

interface ConfirmDeleteDialogProps {
    isOpen: boolean
    isDeleting: boolean
    documentName: string
    onClose: () => void
    onConfirm: () => void
}

export function ConfirmDeleteDialog({ isOpen, isDeleting, documentName, onClose, onConfirm }: ConfirmDeleteDialogProps) {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={() => !isDeleting && onClose()}>
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
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-red-500/10 text-red-500 rounded-full shrink-0">
                                        <Trash2 className="w-6 h-6" />
                                    </div>
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-bold leading-6 text-foreground"
                                    >
                                        Delete Document
                                    </Dialog.Title>
                                </div>

                                <div className="mt-2 text-sm text-muted-foreground">
                                    <p>
                                        Are you sure you want to delete <span className="font-semibold text-foreground">"{documentName}"</span>?
                                    </p>
                                    <p className="mt-2">
                                        This will permanently remove the document and <strong>all</strong> of its associated analysis reports. This action cannot be undone.
                                    </p>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-sidebar focus:outline-none transition-colors cursor-pointer"
                                        onClick={onClose}
                                        disabled={isDeleting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center items-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none disabled:opacity-50 transition-colors cursor-pointer"
                                        onClick={onConfirm}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? (
                                            <>
                                                <Spinner size="sm" className="text-white w-4 h-4" />
                                                Deleting...
                                            </>
                                        ) : (
                                            'Delete'
                                        )}
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
