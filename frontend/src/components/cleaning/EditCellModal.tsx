import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, AlertCircle, Info, Copy } from "lucide-react";

interface EditCellModalProps {
    isOpen: boolean;
    initialValue: any;
    columnName: string;
    issueType: 'outlier' | 'null' | 'duplicate' | 'normal';
    onSave: (newValue: any) => void;
    onClose: () => void;
    bounds?: { lower: number; upper: number } | null;
}

export function EditCellModal({
    isOpen,
    initialValue,
    columnName,
    issueType,
    onSave,
    onClose,
    bounds
}: EditCellModalProps) {
    const [value, setValue] = useState<string>("");

    useEffect(() => {
        setValue(initialValue === null || initialValue === undefined ? "" : String(initialValue));
    }, [initialValue, isOpen]);

    const handleSave = () => {
        // Basic type inference could be improved here, but sending as string/number
        // The backend might need to handle type coercion if we send strings for numbers
        // For now, we'll try to keep numeric if it looks numeric
        let valueToSend: any = value;
        if (value === "") {
            valueToSend = null;
        } else if (!isNaN(Number(value)) && value.trim() !== "") {
            valueToSend = Number(value);
        }
        onSave(valueToSend);
        onClose();
    };

    const getIssueDetails = () => {
        switch (issueType) {
            case 'outlier':
                return {
                    icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
                    title: "Valor Atípico (Outlier)",
                    description: bounds
                        ? `Este valor está fuera del rango esperado (${bounds.lower.toFixed(2)} - ${bounds.upper.toFixed(2)}).`
                        : "Este valor se desvía significativamente de la distribución de la columna.",
                    color: "text-orange-700 bg-orange-50 border-orange-200"
                };
            case 'null':
                return {
                    icon: <AlertCircle className="h-5 w-5 text-red-500" />,
                    title: "Valor Vacío",
                    description: "Esta celda no contiene datos. Los valores nulos pueden afectar los cálculos estadísticos.",
                    color: "text-red-700 bg-red-50 border-red-200"
                };
            case 'duplicate':
                return {
                    icon: <Copy className="h-5 w-5 text-amber-500" />,
                    title: "Fila Duplicada",
                    description: "Esta fila es idéntica a otra en el conjunto de datos. Considere eliminar o modificar los duplicados.",
                    color: "text-amber-700 bg-amber-50 border-amber-200"
                };
            default:
                return {
                    icon: <Info className="h-5 w-5 text-gray-500" />,
                    title: "Editar Celda",
                    description: "Modifique el valor de esta celda.",
                    color: "text-gray-700 bg-gray-50 border-gray-200"
                };
        }
    };

    const details = getIssueDetails();

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        {details.icon}
                        <DialogTitle>{details.title}</DialogTitle>
                    </div>
                    <DialogDescription>
                        Columna: <span className="font-medium text-foreground">{columnName}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className={`p-3 rounded-md border text-sm mb-4 ${details.color}`}>
                    {details.description}
                </div>

                <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cell-value" className="text-right">
                            Valor
                        </Label>
                        <Input
                            id="cell-value"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="col-span-3"
                            autoFocus
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave}>Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
