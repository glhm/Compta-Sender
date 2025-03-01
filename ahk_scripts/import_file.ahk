#Requires AutoHotkey v2.0
#SingleInstance Force
Sleep(400)

; Vérifier si un paramètre a été fourni
if (A_Args.Length < 1) {
    MsgBox("Aucun chemin de fichier n'a été fourni.")
    Exit
}

; Récupérer le chemin du fichier passé en paramètre
filePath := A_Args[1]  ; A_Args[1] est le premier paramètre passé lors de l'exécution du script
filePath := Chr(34) filePath Chr(34)


; Attendre que la fenêtre "JD2M - Google Chrome" soit ouverte
If WinExist("JD2M - Google Chrome")  ; Vérifie si la fenêtre de Chrome est ouverte
{
    WinActivate()  ; Active la fenêtre "JD2M - Google Chrome"
    WinWaitActive()  ; Attends que la fenêtre devienne active

    ; Attendre l'apparition de la fenêtre de dialogue "Ouvrir"
    If WinExist("Ouvrir")  ; Si la fenêtre "Ouvrir" est trouvée
    {
        WinActivate()  ; Active la fenêtre "Ouvrir"
        WinWaitActive()  ; Attends que la fenêtre devienne active

        ; Cliquer sur ToolbarWindow323 pour activer le champ de texte
        ControlClick("Edit1", "Ouvrir")  ; Cela clique sur la barre d'outils (le champ de texte)

        ; Attendre un peu pour s'assurer que le champ est prêt à recevoir du texte
        ; Sleep(200)

        ; Envoyer le chemin du fichier dans la barre d'adresse
        SendInput(filePath)

        ; Attendre un peu pour s'assurer que le chemin est entré correctement
        ; Sleep(200)

        ; Sortir du champ de texte en utilisant la touche Tab pour passer au prochain élément
        Send("{Tab}")

        ; Attendre que le champ perde le focus
        ; Sleep(200)

        ; Appuyer sur "Entrée" pour cliquer sur le bouton "Ouvrir" si le bouton est en surbrillance
        Send("{Enter}")

        ; Attendre un peu pour s'assurer que l'action a été réalisée
        ; Sleep(200)
    }
    else
    {
        MsgBox("La fenêtre 'Ouvrir' n'a pas été trouvée.")
    }
}
else
{
    MsgBox("La fenêtre 'JD2M - Google Chrome' n'a pas été trouvée.")
}
