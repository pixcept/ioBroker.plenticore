![Logo](admin/plenticore.png)

![Number of Installations](http://iobroker.live/badges/plenticore-installed.svg) [![Downloads](https://img.shields.io/npm/dm/iobroker.plenticore.svg)](https://www.npmjs.com/package/iobroker.plenticore)

[![NPM](https://nodei.co/npm/iobroker.plenticore.png?downloads=true)](https://nodei.co/npm/iobroker.plenticore/)

![Stable](http://iobroker.live/badges/plenticore-stable.svg)
[![NPM version](https://img.shields.io/npm/v/iobroker.plenticore.svg)](https://www.npmjs.com/package/iobroker.plenticore)
[![Build Status](https://travis-ci.org/StrathCole/ioBroker.plenticore.svg?branch=master)](https://travis-ci.org/StrathCole/ioBroker.plenticore)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](https://github.com/StrathCole/iobroker.plenticore/blob/master/LICENSE)

# ioBroker.plenticore

Ein ioBroker-Adapter für den KOSTAL Plenticore Plus Wechselrichter (d. h. z. B. Plenticore Plus 8.5)

Dieser Adapter nutzt die interne Web-Schnittstelle des Wechselrichters, um auf die Eigenschaften und Einstellungen Ihres Wechselrichters und der angeschlossenen Geräte (z. B. Batterie oder intelligenter Energiezähler) zuzugreifen. Um den Adapter zu verwenden, muss die ioBroker-Instanz an das Netzwerk angeschlossen sein, in dem sich Ihr KOSTAL Plenticore befindet.

Dieser Adapter ist KEIN offizielles Produkt von KOSTAL und wird von KOSTAL weder unterstützt noch gefördert. Es handelt sich um ein privates Projekt, das sich noch in einem frühen Entwicklungsstadium befindet, die Verwendung erfolgt also auf eigenes Risiko!

## Konfiguration

Stellen Sie die IP-Adresse Ihres Wechselrichters (z. B. 192.168.0.23) und Ihr Passwort ein, mit dem Sie sich als Anlagenbesitzer auf der Web-Schnittstelle des Wechselrichters anmelden. Das Abfrage-Intervall ist in Millisekunden angegeben (d. h. 10000 bedeutet 10 Sekunden).

## Adapter 

Der Adapter verwendet kein Screenscraping. Er verwendet die gleiche REST-API wie die Web-Schnittstelle. Es könnte daher Funktionen geben, die (noch) nicht vom Adapter unterstützt werden.

### Warum nicht (einfach) Modbus verwenden?

Der Wechselrichter unterstützt Modbus TCP, so dass Sie den Modbus-Adapter zur Abfrage von Werten verwenden können. KOSTAL erlaubt jedoch kein Schreiben der Modbus-Adressen. Sie können also z. B. die maximale Entladung der Batterie nicht via Modbus einstellen.

### Den Adapter verwenden

Der Adapter sollte Objekte unter dem plenticore.X-Objektbaum füllen. Einige davon sind schreibgeschützt, z. B. die aktuelle PV-Leistung oder der Stromverbrauch im Haus. Andere sind veränderbar, z. B. der MinSoC der Batterie oder die Batterie-Management-Modi. Der Adapter wurde von mir mit einem Plenticore Plus 10 getestet.

## Objekte

Nachfolgend ein Auszug der wichtigsten Objekte, die von diesem Adapter verwendet und gefüllt werden. Alle mit `[**]` markierten Einstellungen sollten editierbar sein, aber nicht alle wurden getestet und es könnten bei der Verwendung Fehler auftreten.

### plenticore.X.devices.local

Der Bereich devices.local enthält Informationen über den Wechselrichter und den eventuell angeschlossenen intelligenten Energiezähler und/oder die Batterie.

`plenticore.X.devices.local.Dc_P` - die aktuelle DC-Leistung einschließlich der selbstgenutzten Leistung des Wechselrichters. Dieser Wert sollte nahe dem Werte von `plenticore.X.devices.local.ac.P` (etwa +30-40W) liegen.  
`plenticore.X.devices.local.Pv_P` - die aktuell erzeugte PV-Leistung. Dieser Wert wird vom Adapter durch Aufsummieren der pvx.P-Werte berechnet.  
`plenticore.X.devices.local.Home_P` - der aktuelle Gesamthausverbrauch  
`plenticore.X.devices.local.HomeBat_P` - der aktuelle Hausverbrauch, die von der Batterie geliefert wird  
`plenticore.X.devices.local.HomePv_P` - der aktuelle Hausverbrauch, die direkt von der Anlage geliefert wird  
`plenticore.X.devices.local.HomeGrid_P` - der aktuelle, vom Netz bereitgestellte Hausverbrauch  
`plenticore.X.devices.local.ToGrid_P` - die aktuelle Leistung, die in das Netz eingespeist wird. Dieser Wert wird vom Adapter berechnet und ist möglicherweise nicht 100% genau.  
`plenticore.X.devices.local.LimitEvuAbs` - die berechnete Abregelungsgrenze für die Energie, die den Wechselrichter verlassen darf. Wenn mehr Leistung von der Anlage erzeugt wird, geht diese verloren.  
`plenticore.X.devices.local.StateKey0` - falls zutreffend, wurde das Batteriemanagement des Wechselrichters freigeschaltet.

#### plenticore.X.devices.local.ac

Dieser Kanal enthält Informationen über die AC-Seite des Wechselrichters. Die wichtigsten sind:  
`plenticore.X.devices.local.ac.Frequency` - die Netzfrequenz  
`plenticore.X.devices.local.ac.L1_P` - die aktuelle Leistung der Phase 1 in W  
`plenticore.X.devices.local.ac.L2_P` - die aktuelle Leistung der Phase 2 in W  
`plenticore.X.devices.local.ac.L3_P` - die aktuelle Leistung der Phase 3 in W  
`plenticore.X.devices.local.ac.P` - die aktuelle Gesamtleistung, die vom Wechselrichter abgegeben wird, einschließlich der Batterieentladung

#### plenticore.X.devices.local.battery

`plenticore.X.devices.local.battery.Cycles` - die gesamte Anzahl der Batteriezyklen bis jetzt  
`[**] plenticore.X.devices.local.battery.DynamicSoc` - true, wenn dynamisches SoC aktiviert ist (nur wenn auch `SmartBatteryControl` true ist)  
`[**] plenticore.X.devices.local.battery.MinHomeConsumption` - der minimale Stromverbrauch im Haus, ab dem Batterie genutzt wird  
`[**] plenticore.X.devices.local.battery.MinSoc` - der gewünschte minimale SoC (State of Charge) der Batterie. Der tatsächliche SoC kann bei fehlender Sonnenenergie unter diesen Wert sinken.  
`plenticore.X.devices.local.battery.MinSocDummy` - Dieser Wert wird vom Adapter gesetzt, wenn das MinSoC-Management in der Konfiguration deaktiviert ist. Er soll zeigen, auf welchen Wert das MinSoC gesetzt würde.  
`plenticore.X.devices.local.battery.P` - die aktuelle Batterieleistung (negativ beim Laden, positiv beim Entladen)  
`plenticore.X.devices.local.battery.Charge_P` - die aktuelle Ladeleistung der Batterie (0 bei Entladung)  
`plenticore.X.devices.local.battery.Discharge_P` - die aktuelle Entladeleistung der Batterie (0 beim Laden)  
`[**] plenticore.X.devices.local.battery.SmartBatteryControl` - true, wenn das Smart Battery Management aktiviert ist. Gemäß dem offiziellen Handbuch darf dies nur dann aktiviert werden, wenn keine weitere AC-Quelle wie ein zweiter Wechselrichter beteiligt ist.  
`[**] plenticore.X.devices.local.battery.ExternControl` - 0 für interne Steuerung, 1 für externe Steuerung via Digital I/O, 2 für externe Steuerung via Modbus TCP
`plenticore.X.devices.local.battery.SoC` - der aktuelle Ladezustand der Batterie  

#### plenticore.X.devices.local.inverter

`plenticore.X.devices.local.inverter.MaxApparentPower` - die maximale Leistung, die der Wechselrichter bereitstellen kann

#### plenticore.X.devices.local.pv1 / pv2 / pv3

`plenticore.X.devices.local.pvX.P` - die aktuelle Leistung, die von der Phase X der Anlage bereitgestellt wird

### plenticore.X.scb

Dieser Kanal enthält Informationen und Einstellungen des Geräts selbst

#### plenticore.X.scb.modbus

`[**] plenticore.X.scb.modbus.ModbusEnable` - true, wenn der Modbus tcp aktiviert ist  
`[**] plenticore.X.scb.modbus.ModbusUnitId` - Modbus-Device-ID des Geräts

#### plenticore.X.scb.network

`[**] plenticore.X.scb.network.hostname` - der aktuelle Hostname des Wechselrichters  
`[**] plenticore.X.scb.network.IPv4Auto` - DHCP für die IP-Adresseneinstellungen des Wechselrichters verwenden.  
`[**] plenticore.X.scb.network.IPv4Address` - die aktuelle IP-Adresse des Wechselrichters  
`[**] plenticore.X.scb.network.IPv4DNS1` und `plenticore.X.scb.network.IPv4DNS2` - die derzeit verwendeten DNS-Server  
`[**] plenticore.X.scb.network.IPv4Gateway` - das derzeit verwendete Netzwerk-Gateway  
`[**] plenticore.X.scb.network.IPv4Subnetmask` - die Netzwerk-Subnetzmaske  

#### plenticore.X.scb.time

`[**] plenticore.X.scb.time.NTPservers` - die derzeit verwendeten Zeitserver (NTP). Dies können mehrere, durch Leerzeichen getrennte, Server sein.  
`[**] plenticore.X.scb.time.NTPuse` - NTP verwenden, um die aktuellen Gerätezeit zu setzen.  
`[**] plenticore.X.scb.time.Timezone` - die Zeitzone des Geräts

### plenticore.X.scb.statistic.EnergyFlow

Die Datenpunkte in diesem Abschnitt enthalten die Statistiken, die in der Plenticore-Web-Benutzeroberfläche sichtbar sind. Nachfolgend werden nur die `Day` (Tag) Datenpunkte erwähnt, aber jeder von ihnen ist auch für `Month` (Monat), `Year` (Jahr) und `Total` (Insgesamt) verfügbar.

`plenticore.0.scb.statistic.EnergyFlow.AutarkyDay` - die Autarkie in Prozent für den aktuellen Tag  
`plenticore.0.scb.statistic.EnergyFlow.CO2SavingDay` - die geschätzte CO2-Einsparung in kg für den aktuellen Tag  
`plenticore.0.scb.statistic.energyFlow.energyHomeDay` - der gesamte Hausverbrauch in Wh für den aktuellen Tag  
`plenticore.0.scb.statistic.EnergyFlow.EnergyHomePvDay` - der gesamte Hausverbrauch, der von der PV-Anlage für den aktuellen Tag bereitgestellt wird  
`plenticore.0.scb.statistic.EnergyFlow.EnergyHomeBatDay` - der gesamte von der Batterie bereitgestellte Hausverbrauch für den aktuellen Tag  
`plenticore.0.scb.statistic.EnergyFlow.EnergyHomeGridDay` - der gesamte vom Stromnetz bereitgestellte Hausverbrauch für den aktuellen Tag  
`plenticore.0.scb.statistic.EnergyFlow.EnergyToGridDay` - die gesamte in das Stromnetz eingespeiste Leistung für den aktuellen Tag  
`plenticore.0.scb.statistic.EnergyFlow.OwnConsumptionRateDay` - die Eigenverbrauchsquote (erzeugte Anlagenleistung, die NICHT ins Netz geht) für den aktuellen Tag  
`plenticore.0.scb.statistic.EnergyFlow.YieldDay` - der Gesamtertrag der Anlage für den aktuellen Tag

## Prognose-Daten

Die Vorhersagefunktion verwendet verschiedene Wetterdatenquellen. Sie funktioniert ohne externe Adapter, aber Sie können die Ergebnisse verbessern, indem Sie Instanzen von einem oder mehreren der folgenden Wetteradapter aktivieren: ioBroker.darksky, ioBroker.weatherunderground, ioBroker.daswetter. Damit die Prognose funktioniert, müssen Sie die globale Geoposition des Systems (Längen- und Breitengrad) konfigurieren und die erweiterte Konfiguration des Plenticore-Adapters (Panel- und Batteriedaten, falls zutreffend) ausfüllen.

### Wie funktioniert die Vorhersage?

Die Prognosefunktion verwendet die bereitgestellten Daten Ihrer Anlage und ggf. Ihrer Batterie, um die maximal mögliche Stromerzeugung zu jeder Tageszeit zu berechnen. Dazu wird der Standort des Systems verwendet, um die Sonnenhöhe und den Azimut zu ermitteln und die Werte der Sonneneinstrahlung zu berechnen. Diese Werte werden mit Wettervorhersagedaten aus verschiedenen Quellen kombiniert, um die Bewölkungs-, Nebel- und Regenvorhersage für jede Stunde des Tages zu erhalten. Anhand dieser Daten berechnet der Adapter eine mögliche Leistung, die die Anlage in jeder Sonnenstunde des Tages erzeugen könnte.

Die Prognosewerte können dann verwendet werden, um den MinSoC der Batterie einzustellen, das dynamische "intelligente Batterie-Management" des Wandlers zu aktivieren oder zu deaktivieren (beides wird intern vom Adapter durchgeführt) oder andere Geräte im Haushalt zu steuern, z. B. Heizung, Waschmaschine, Trockner, Geschirrspüler usw. (durch externes JavaScript/Blockly des Benutzers).


### plenticore.0.forecast.consumption

`plenticore.0.forecast.consumption.day` - aktueller Stromverbrauch im Tagesdurchschnitt der letzten 3 Tage  
`plenticore.0.forecast.consumption.night` - aktueller Stromverbrauch im Durchschnitt der letzten 3 Tage während der Nacht  
`plenticore.0.forecast.consumption.remaining` - geschätzter verbleibender Stromverbrauch für den aktuellen Prognosetag bis zum Sonnenuntergang

### plenticore.0.forecast.current

`plenticore.0.forecast.current.power.generated` - erzeugte Anlagenleistung am aktuellen Tag bis zur aktuellen Zeit  
`plenticore.0.forecast.current.power.max` - berechnete maximale Anlagenleistung bei klarem Himmel (0% Wolkenbedeckung)  
`plenticore.0.forecast.current.power.sky` - berechnete Anlagenleistung unter Berücksichtigung der aktuellen Wolkenbedeckung  
`plenticore.0.forecast.current.power.skyvis` - berechnete Anlagenleistung unter Berücksichtigung der aktuellen Wolkenbedeckung und Sichtweite  
`plenticore.0.forecast.current.power.skyvisrain` - berechnete Anlagenleistung unter Berücksichtigung der aktuellen Wolkenbedeckung, Sichtweite und Regenvorhersage von Wetteradaptern  
`plenticore.0.forecast.current.visibility.*` - aktuelle Sichtweitenvorhersage, die vom entsprechenden Wetteradapter bereitgestellt wird  
`plenticore.0.forecast.current.rain.*` - aktuelle Regenvorhersage, die vom entsprechenden Wetteradapter bereitgestellt wird  
`plenticore.0.forecast.current.rainChance.*` - aktuelle Regenwahrscheinlichkeitsvorhersage, die vom entsprechenden Wetteradapter bereitgestellt wird  
`plenticore.0.forecast.current.sky.*` - aktuelle Wolkenvorhersage, die vom entsprechenden Wetteradapter bereitgestellt wird  
`plenticore.0.forecast.current.sky_high.*` - aktuelle Wolkenvorhersage (obere Luftschichten), die vom entsprechenden Wetteradapter bereitgestellt wird  
`plenticore.0.forecast.current.sky_medium.*` - aktuelle Wolkenvorhersage (mittlere Luftschichten), die vom entsprechenden Wetteradapter bereitgestellt wird  
`plenticore.0.forecast.current.sky_low.*` - aktuelle Wolkenvorhersage (untere Luftschichten), die vom entsprechenden Wetteradapter bereitgestellt wird  
`plenticore.0.forecast.current.sun.azimuth` - aktueller Sonnenstand (Azimut)  
`plenticore.0.forecast.current.sun.elevation` - aktueller Sonnenstand (Elevation)  

### plenticore.0.forecast.day1 – dasselbe gilt für Tag2

`plenticore.0.forecast.day1.power.date` - Datum, für das die aktuelle Leistungsprognose gilt  
`plenticore.0.forecast.day1.power.day` - Gesamtleistungsprognose für den Tag  
`plenticore.0.forecast.day1.power.day_adjusted` - Gesamtleistungsprognose für den Tag unter Berücksichtigung der bisher erzeugten Leistung und unter Verwendung der Vorhersagedaten für die verbleibenden Sonnenstunden  
`plenticore.0.forecast.day1.power.day_high` - Gesamtleistungsprognose für den Tag ohne Berücksichtigung der Sichtweitendaten des Wetteradapters  
`plenticore.0.forecast.day1.power.remaining` - verbleibende Leistungsprognose für den Tag, basierend auf der Prognose für die verbleibenden Sonnenstunden  
`plenticore.0.forecast.day1.power.Xh.power` - geschätzte Gesamtleistung der Anlage zur Sonnenstunde X des Vorhersagetages, wobei 1h die Stunde des Sonnenaufgangs ist  
`plenticore.0.forecast.day1.power.Xh.power_high` - geschätzte Gesamtleistung der Anlage in Sonnenstunde X des Vorhersagetages, aber ohne Berücksichtigung der Sichtweiten- oder Regendaten  
`plenticore.0.forecast.day1.power.Xh.time` - die Zeit, zu der die Sonnenstunde für `plenticore.0.forecast.power.Xh.power` beginnt  
`plenticore.0.forecast.day1.sun.sunrise` - Sonnenaufgang des Vorhersagedatums  
`plenticore.0.forecast.day1.sun.sunset` - Sonnenuntergang des Vorhersagedatums  

## Changelog

### 2.1.9
- met.no Regenvorhersagewert korrigiert

### 2.1.8
- Update der met.no API auf locationforecast 2.0
- xml2js Bibliothek entfernt
- Aktualisierung der Basisbibliothek

### 2.1.7
- Bibliothek aktualisiert, um js controller 3.2 zu unterstützen

### 2.1.6
- Copyright-Jahr aktualisiert

### 2.1.5
- Paketinformationen korrigiert

### 2.1.4
- Deaktivieren der intelligenten Batteriesteuerung, solange der SoC unter MinSoC + 8% liegt, um zu vermeiden, dass bei Verbrauchsspitzen Netzstrom verwendet wird
- Darksky-Nutzung deaktivieren (Dienst eingestellt)

### 2.1.3
- Fehler mit falscher Stunde der Wettervorhersage vom Daswetter-Adapter behoben

### 2.1.2
- Einstellung für minimalen Ladezustand hinzugefügt, ab dem das Batteriemanagement aktiviert werden darf

### 2.1.1
- Probleme in Konfiguration und Übersetzungen behoben

### 2.1.0
- Weitere Wetterdaten-Quellen hinzugefügt, um bessere Leistungsprognosen zu ermöglichen
- Prognose für den zweiten Tag hinzugefügt
- Verbesserter Code und einige kleinere Probleme behoben
- Neue Abhängigkeit für xml2js
- Aktualisierte Readme

### 2.0.0

- Code-Überarbeitung
- Viele Funktionen an Bibliotheken ausgelagert
- Diese Version hat neue Abhängigkeiten und erfordert eine neuere Adapter-Core-Version!
- Mehrere Korrekturen

### 1.1.1

- Keine Änderungen

### 1.1.0

- Unterstützung für den Weatherunderground-Wetter-Adapter wurde hinzugefügt. Der Adapter kann als alternative Vorhersagequelle über den DarkSky-Adapter gewählt werden.

### 1.0.2

- Eine Warnmeldung, die viel zu oft auftrat, wurde behoben.

### 1.0.1

- Prognose-Funktionen zur Readme hinzugefügt

### 1.0.0

- Leistungsvorhersage-Funktion hinzugefügt

### 0.1.5

- Übersetzungen hinzugefügt
- Die Handhabung des Schattenmanagements wurde korrigiert.

### 0.1.4

- Schattenmanagement-Datenpunkt hinzugefügt.

### 0.1.3

- Keine Abfrage der Batteriewerte, wenn das Batterie-Management nicht freigeschaltet ist.

### 0.1.2

- Probleme bei der Adapterprüfung behoben, siehe https://github.com/StrathCole/ioBroker.plenticore/issues/1.
- Statistische Datenpunkte hinzugefügt.

### 0.1.1

- Admin-Adapter-Abhängigkeit entfernt

### 0.1.0

- Erste laufende Version

## Lizenz

The MIT License (MIT)

Copyright (c) 2021 Marius Burkard

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.


## Spenden
[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=SFLJ8HCW9T698&source=url)
