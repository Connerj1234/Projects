import sys
import requests
from PyQt5.QtWidgets import (QApplication, QWidget, QLabel, QLineEdit, QPushButton, QVBoxLayout, QRadioButton)
from PyQt5.QtCore import Qt, QTime, QTimer

import config

class WeatherApp(QWidget):
    def  __init__(self):
        super().__init__()
        self.city_label = QLabel("Enter City Name: ", self)
        self.city_input = QLineEdit(self)
        self.get_weather_button = QPushButton("Get Weather", self)
        self.temperature_label = QLabel(self)
        self.emoji_label = QLabel(self)
        self.description_label = QLabel(self)
        self.celsius_radio = QRadioButton("Celsius", self)
        self.fahrenheit_radio = QRadioButton("Fahrenheit", self)

        self.time_label = QLabel(self)
        self.timer = QTimer(self)

        self.celsius_radio.setChecked(False)
        self.fahrenheit_radio.setChecked(True)


        self.setFixedSize(400, 670)
        self.get_weather_button.setFixedSize(360, 45)
        self.city_input.setFixedSize(360, 55)

        self.initUI()

    def initUI(self):
        self.setWindowTitle("Conner's Weather App")

        vbox = QVBoxLayout()
        vbox.addWidget(self.city_label)
        vbox.addWidget(self.city_input)
        vbox.addWidget(self.get_weather_button)
        vbox.addWidget(self.temperature_label)
        vbox.addWidget(self.emoji_label)
        vbox.addWidget(self.description_label)
        vbox.addWidget(self.time_label)


        self.setLayout(vbox)

        self.city_label.setAlignment(Qt.AlignCenter)
        self.city_input.setAlignment(Qt.AlignCenter)
        self.emoji_label.setAlignment(Qt.AlignCenter)
        self.temperature_label.setAlignment(Qt.AlignCenter)
        self.description_label.setAlignment(Qt.AlignCenter)
        self.celsius_radio.setGeometry(230, 1, 100, 100)
        self.fahrenheit_radio.setGeometry(70, 1, 100, 100)
        self.time_label.setAlignment(Qt.AlignCenter)
        
        self.city_label.setObjectName("city_label")
        self.city_input.setObjectName("city_input")
        self.get_weather_button.setObjectName("get_weather_button")
        self.temperature_label.setObjectName("temperature_label")
        self.emoji_label.setObjectName("emoji_label")
        self.description_label.setObjectName("description_label")
        self.time_label.setObjectName("time_label")

        self.setStyleSheet(""" 
            QLabel, QPushButton, QRadioButton{
                font-family: arial;
                color: white;
            }
            QRadioButton{
                font-size: 15px;
            }
            QLabel#time_label{
                font-size: 30px;
            }
            QLabel#city_label{
                font-size: 40px;
                font-weight: bold;
                padding-top: 70px;
            }
            QLineEdit#city_input{
                font-size: 40px;
                border: 1.5px solid white;
                border-radius: 10px;
                background-color: black;
            }
            QPushButton#get_weather_button{
                font-size: 30px;
                border: 1.5px solid white;
                border-radius: 10px;
                background-color: black;
            }
            QLabel#temperature_label{
                font-size: 65px;
            }
            QLabel#emoji_label{
                font-size: 90px;
            }
            QLabel#description_label{
                font-size: 50px;
            }
        """)
        
        self.get_weather_button.clicked.connect(self.get_weather)

        self.timer.timeout.connect(self.update_time)
        self.timer.start(1000)
        self.update_time()

    def get_weather(self):
        api_key = config.api
        city = self.city_input.text()
        url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}"

        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()

            if data["cod"] == 200:
                self.display_weather(data)
        except requests.exceptions.HTTPError as http_error:
            match response.status_code:
                case 400:
                    self.display_error("Bad request:\nPlease check your input")
                case 401:
                    self.display_error("Unauthorized:\nInvalid API key")
                case 403:
                    self.display_error("Forbidden:\nAccess denied")
                case 404:
                    self.display_error("Not found:\nCity not found")
                case 500:
                    self.display_error("Internal server error:\nPlease try again later")
                case 502:
                    self.display_error("Bad Gateway:\nInvalid response from server")
                case 503:
                    self.display_error("Service Unavailable:\nServer is down")
                case 504:
                    self.display_error("Gateway Timeout:\nNo response form server")
                case _:
                    self.display_error(f"HTTP error occured:\n{http_error}")
        except requests.exceptions.ConnectionError:
            self.display_error("Connection Error:\nCheck your internet connection")
        except requests.exceptions.Timeout:
            self.display_error("Timeout Error:\nThe request timed out")
        except requests.exceptions.TooManyRedirects:
            self.display_error("Too many redirects:\nCheck the URL")
        except requests.exceptions.RequestException as req_error:
            print(f"Request Error:\n{req_error}")
        
        

    def display_error(self, message):
        self.temperature_label.setText(message)
        self.temperature_label.setStyleSheet("font-size: 30px")
        self.emoji_label.clear()
        self.description_label.clear()

    def display_weather(self, data):
        self.temperature_label.setStyleSheet("font-size: 75px")
        temperature_k = data["main"]["temp"]
        temperature_c = temperature_k - 273.15
        temperature_f = (temperature_k * 9/5) - 459.67
        weather_id = data["weather"][0]["id"]
        weather_description = data["weather"][0]["description"]
        
        if self.fahrenheit_radio.isChecked():
            self.temperature_label.setText(f"{temperature_f:.1f}°F")
        else:
            self.temperature_label.setText(f"{temperature_c:.1f}°C")
        self.description_label.setText(f"{weather_description}")
        self.emoji_label.setText(self.get_weather_emoji(weather_id))

    @staticmethod
    def get_weather_emoji(weather_id):
        if 200 <= weather_id <= 232:
            return "⛈️"
        elif 300 <= weather_id <= 321:
            return "🌦️"
        elif 500 <= weather_id <= 531:
            return "🌧️"
        elif 600 <= weather_id <= 622:
            return "🌨️"
        elif 701 <= weather_id <= 741:
            return "🌫️"
        elif weather_id == 762:
            return "🌋"
        elif weather_id == 781:
            return "🌪️"
        elif weather_id == 800:
            return "☀️"
        elif 801 <= weather_id <= 804:
            return "☁️"

    def update_time(self):
        current_time = QTime.currentTime().toString("hh:mm:ss AP")
        self.time_label.setText(current_time)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    weather_app = WeatherApp()
    weather_app.show() 
    sys.exit(app.exec_())