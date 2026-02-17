const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://gsu-commuter-helper.onrender.com";

const DEFAULTS = {
  "G Deck": {
    open_spaces: "253",
    percentage: "50%",
  }
};

// === Full Deck Data ===
const deckData = {
    atlanta: [
    {
      name: "CC Deck",
      location: "76 Fulton St SW, Atlanta, GA",
      googleMaps: "https://www.google.com/maps/place/GSU+CC+Deck/@33.7427283,-84.3905755,17z/data=!3m1!4b1!4m6!3m5!1s0x88f503002e3e792f:0xfbdc4ae779ea51fa!8m2!3d33.7427283!4d-84.3880006!16s%2Fg%2F11w8gtrkgh?entry=ttu&g_ep=EgoyMDI1MDQxNi4xIKXMDSoASAFQAw%3D%3D",
      hours: `
        6:30am – 9:45pm. No overnight parking. <br>
        Game Day: Open 4 hours prior to kick-off.
      `,
      image: "images/cc_deck.jpg",
      accessibility: "Yes",
    },
    {
      name: "K Deck",
      location: "153 Jesse Hill Jr Dr SE, Atlanta, GA",
      googleMaps: "https://www.google.com/maps/place/K+Deck,+Atlanta,+GA+30303/@33.7511348,-84.3852029,18z/data=!3m1!4b1!4m5!3m4!1s0x88f5038f16826f45:0x43eb437fe435d0b0!8m2!3d33.7511348!4d-84.3841086?shorturl=1",
      hours: `
        6:30am – 9:45pm. No overnight parking.<br>
        Saturday/Sunday (Closed)
      `,
      image: "images/K_Deck.jpg",
      accessibility: "No",
    },
    {
      name: "M Deck",
      location: "33 Auditorium Place, Atlanta, GA",
      googleMaps: "https://www.google.com/maps/place/33+Auditorium+Pl+SE,+Atlanta,+GA+30303/@33.7532309,-84.3866321,17z/data=!3m1!4b1!4m6!3m5!1s0x88f50388c3866ef3:0x64d310656c6dd8f4!8m2!3d33.7532309!4d-84.3840572!16s%2Fg%2F11gxjw623r?entry=ttu&g_ep=EgoyMDI1MDQxNi4xIKXMDSoASAFQAw%3D%3D",
      hours: `
        6:30am – 9:45pm. No overnight parking.<br>
        Saturday/Sunday (Closed)
      `,
      image: "images/m-deck.webp",
      accessibility: "No",
    },
    {
      name: "N Deck",
      location: "118 Gilmer St SE, Atlanta, GA",
      googleMaps: "https://www.google.com/maps/place/GSU+Parking+Deck+N/@33.7516319,-84.3867768,17z/data=!3m1!4b1!4m6!3m5!1s0x88f503623b382a75:0xa4ce9fe7501ab55!8m2!3d33.7516319!4d-84.3842019!16s%2Fg%2F11mq3c_nsd?entry=ttu&g_ep=EgoyMDI1MDQxNi4xIKXMDSoASAFQAw%3D%3D",
      hours: `
        6:30am – 9:45pm. No overnight parking.
      `,
      image: "images/N_Deck.jpg",
      accessibility: "No",
    },
    {
      name: "S Deck",
      location: "189 Gilmer St SE, Atlanta, GA",
      googleMaps: "https://www.google.com/maps/place/S+Deck,+Atlanta,+GA+30303/@33.7517045,-84.3846347,18z/data=!3m1!4b1!4m5!3m4!1s0x88f5038f2411d72d:0x6986f87b48a63074!8m2!3d33.7517045!4d-84.3835404?shorturl=1",
      hours: `
        6:30am – 9:45pm. No overnight parking.
      `,
      image: "images/S_Deck.jpg",
      accessibility: "No",
    },
    {
      name: "T Deck",
      location: "43 Auburn Ave NE, Atlanta, GA",
      googleMaps: "https://www.google.com/maps/place/T+Deck/@33.7552125,-84.3895507,17z/data=!3m1!4b1!4m6!3m5!1s0x88f503584af812c5:0x2565b914af6b0d4e!8m2!3d33.7552125!4d-84.3869758!16s%2Fg%2F11tn5jh35h?entry=ttu&g_ep=EgoyMDI1MDQxNi4xIKXMDSoASAFQAw%3D%3D",
      hours: `
        <strong>Student/Faculty/Staff/Visitor:</strong><br>
        Monday – Friday: 6:30am to 9:45 pm (Regular Hours)<br>
        Saturday – Sunday, and Monday – Friday<br>
        <bold>After Hours: Permit Access Only</bold>
      `,
      image: "images/T_deck.jpg",
      accessibility: "Yes",
    },
    {
      name: "G Deck",
      location: "52 Central Ave SW, Atlanta, GA",
      googleMaps: "https://www.google.com/maps/place/G+Deck,+52+Central+Ave+SW,+Atlanta,+GA+30303/@33.7520071,-84.3901179,17z/data=!3m1!4b1!4m6!3m5!1s0x88f50385c454022b:0x92020658b195760f!8m2!3d33.7520071!4d-84.387543!16s%2Fg%2F12vt8ycnr?entry=ttu&g_ep=EgoyMDI1MDQxNi4xIKXMDSoASAFQAw%3D%3D",
      hours: `
        <strong>Faculty/Staff/Visitor Parking:</strong><br>
        Monday – Friday: 6:30 a.m. – 9:45 p.m.<br>
        Saturday: 7 a.m. – 9:30 p.m. (Collins St. Entrance only) (Central Ave. closes at 5 p.m.)<br>
        Sunday: 11 a.m. – 9:30 p.m. (Collins St. Entrance only)<br><br>
        <strong>Student Parking:</strong><br>
        Monday – Friday: After 4 p.m. – 9:45 p.m.<br>
        Saturday: 7 a.m. – 9:30 p.m. (Collins St. Entrance only)<br>
        Sunday: 11 a.m. – 9:30 p.m. (Collins St. Entrance only)
      `,
      image: "images/G_deck.jpg",
      accessibility: "Yes",
    },
    ]
  };

  window.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".deck-card");
    cards.forEach(card => {
      const name = card.querySelector("h2").innerText;
      const data = deckData.atlanta.find(d => d.name === name);
      if (data) {
        card.querySelector(".spaces").innerText = "--";
        card.querySelector(".percentage").innerText = "--%";
        card.querySelector(".address").innerText = data.location;
      }
    });
    fetch(`${BASE_URL}/api/parking`)
    .then(res => res.json())
    .then(data => {
      cards.forEach(card => {
        const name = card.querySelector("h2").innerText.trim();
        const deck = data.find(d => d.deck_name.trim() === name) || DEFAULTS[name];
        if (deck) {
          card.querySelector(".spaces").innerText = deck.open_spaces;
          card.querySelector(".percentage").innerText =
            typeof deck.percentage === "number" ? `${deck.percentage}%` : deck.percentage;
        }
      });
    })
    .catch(err => console.error("Failed to fetch parking data:", err));

    const now = new Date().toLocaleTimeString();
    document.getElementById("last-updated-time").innerText = now;

    // Trigger refresh on page load
    fetch(`${BASE_URL}/api/refresh-parking`, { method: "POST" })
        .then(res => res.json())
        .then(data => {
          cards.forEach(card => {
            const name = card.querySelector("h2").innerText.trim();
            const deck = data.find(d => d.deck_name.trim() === name) || DEFAULTS[name];
            if (deck) {
              card.querySelector(".spaces").innerText = deck.open_spaces;
              card.querySelector(".percentage").innerText =
                typeof deck.percentage === "number" ? `${deck.percentage}%` : deck.percentage;
            }
          });

          const now = new Date().toLocaleTimeString();
          document.getElementById("last-updated-time").innerText = now;
        })
        .catch(err => console.error("❌ Auto-refresh failed:", err));
  });

  document.getElementById("refresh-btn").addEventListener("click", () => {
    fetch(`${BASE_URL}/api/refresh-parking`, { method: "POST" })
      .then(res => res.json())
      .then(data => {
        data.forEach(deck => {
          const card = [...document.querySelectorAll(".deck-card")].find(c =>
            c.querySelector("h2").innerText.trim() === deck.deck_name.trim()
          );
          if (card) {
            card.querySelector(".spaces").innerText = deck.open_spaces;
            card.querySelector(".percentage").innerText = `${deck.percentage}%`;
          }
        });

        const now = new Date().toLocaleTimeString();
        document.getElementById("last-updated-time").innerText = now;
      })
      .catch(err => console.error("❌ Refresh error:", err));
  });

  function showDeckDetails(deckName) {
    const data = deckData.atlanta.find(d => d.name === deckName);
    if (!data) return;

    // Remove existing modal if any
    const existingModal = document.querySelector(".deck-modal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.classList.add("deck-modal");
    modal.style.position = "fixed";
    modal.style.top = 0;
    modal.style.left = 0;
    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = 1000;

    const content = document.createElement("div");
    content.style.background = "white";
    content.style.padding = "20px";
    content.style.border = "2px solid #002b6c";
    content.style.borderRadius = "10px";
    content.style.boxShadow = "0 0 20px rgba(0,0,0,0.3)";
    content.style.maxWidth = "500px";
    content.style.textAlign = "left";
    content.innerHTML = `
      <h2>${deckName}</h2>
      <img src="${data.image}" alt="${deckName}" style="width: 100%; border-radius: 10px; margin-bottom: 10px;" />
      <strong>Location:</strong> ${data.location}<br><br>
      <strong>Hours:</strong><br>${data.hours}<br><br>
      <strong>Accessibility:</strong> ${data.accessibility}<br><br>
      <a href="${data.googleMaps}" target="_blank">View on Google Maps</a><br><br>
      <button onclick="this.closest('.deck-modal').remove()">Close</button>
    `;

    // Close modal on background click
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        modal.remove();
      }
    });

    modal.appendChild(content);
    document.body.appendChild(modal);
  }
