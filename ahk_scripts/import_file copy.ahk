; Script AHK pour importer un fichier
; Paramètres:
;   %1% - Premier paramètre supplémentaire (optionnel)
;   %2% - Deuxième paramètre supplémentaire (optionnel)

#Requires AutoHotkey v2.0

; Récupérer les paramètres passés au script
param1 := A_Args[1] ? A_Args[1] : ""
param2 := A_Args[2] ? A_Args[2] : ""

; Afficher les paramètres reçus (pour le débogage)
FileAppend("Paramètres reçus: " . param1 . ", " . param2 . "`n", "*")

; Attendre que la boîte de dialogue d'importation apparaisse
Sleep(1000)

; Utiliser les paramètres pour personnaliser le comportement du script
if (param1 != "") {
    FileAppend("Utilisation du paramètre 1: " . param1 . "`n", "*")
    ; Exemple: Si param1 contient un chemin de fichier spécifique
    filePath := param1
} else {
    ; Chemin par défaut
    filePath := A_Desktop . "\facture.pdf"
}

if (param2 != "") {
    FileAppend("Utilisation du paramètre 2: " . param2 . "`n", "*")
    ; Exemple: Si param2 contient un délai d'attente personnalisé
    waitTime := Integer(param2)
} else {
    ; Délai par défaut
    waitTime := 1000
}

; Simuler la sélection de fichier
Send(filePath)
Sleep(waitTime)
Send("{Enter}")

FileAppend("Script d'importation terminé`n", "*")