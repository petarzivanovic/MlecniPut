from geopy.distance import geodesic

def izracunaj_udaljenost(tacka_a, tacka_b):
    """_summary_
        vraca udaljenosti 
    Args:
        tacka_a (_type_): latitude
        tacka_b (_type_): longitude
    """
    return geodesic(tacka_a, tacka_b).km

def proveri_isplativost(litri,km):
    """Da li nam se isplati da palimo kamion"""
    a = 180  #prodajna cena
    b= a*0.9 #pare nakon PDV-a
    c= b- 80 #pare nakon sto oduzmemo nabavnu cenu mleka
    trosak_po_km=35 #Gorivo + amortizacija 
    zarada_po_litru = c
    
    ukupna_zarada= litri*zarada_po_litru
    ukupni_trosak= km*trosak_po_km
    
    # Ako je zarada veca od troska vracamo True
    return (ukupna_zarada - ukupni_trosak)>1500
    
    