# Audiobookshelf Sonos

A standalone server that adds support for listening to an Audiobookshelf library on Sonos speakers. Built on top of the Sonos Music API (SMAPI).

**This is currently for development testing purposes, and is expected to change significantly**

## Features

- Access to all audiobooks in a single Audiobookshelf library
- Sync progress to and from Audiobookshelf

## Missing Features

- Authentication. Currently anyone on the network can access the library made available through this server from within the Sonos app
- Browsing different libraries
- Viewing audiobook metadata such as descriptions
- Cover Art on the Sonos music player doesn't load
- M4B files have _very_ spotty coverage right now (MP3s with proper mime-type have full support)
- Individual chapter support ("previous" and "next" seek moves between MP3 tracks rather than chapters)

## How it works

When you use the Sonos app, you have the ability to add "music services" (Audible, YouTube Music, Libby, iHeartRadio, etc.). These services have been developed, submitted to Sonos for approval, and made available to all Sonos users on behalf of the companies that own them. Each company (developer) is responsible for hosting the actual service itself.

The services are built on top of the [Sonos Music API](https://developer.sonos.com/reference/sonos-music-api/) (aka SMAPI), which is a [SOAP API](https://stoplight.io/api-types/soap-api). The service functions as a middleware for the Sonos device to reach out to, and in response get information on the items available, metadata, stream URIs, etc.

For development puropses, Sonos allows you to manually configure a local service, called a "Custom Service", which is what this application uses. This is done through the Custom Service Descriptor page that is hosted on each Sonos device. This is how this application works -- it is configured as a Custom Service on a local device and made available to all users on the network.

## How this server works

There are a 3 main pieces

### `sonos.wsdl`

The WSDL (Web Service Description Language) file provided by Sonos. This is used in SOAP to describe a SOAP service.

### `sonos-service.js`

Our implementation of the `sonos.wsdl` file (the entire thing does not need to be implemented -- audiobooks only require a select few pieces). It can be thought of as the SOAP router and controller. There is a decent amount of "SOAP magic" that goes on here -- it creates reponse XML tags in it's reponses based on the function name, etc.

### `soap-server.js`

This is the actual express and soap server. 2 things happen in this file:

1. The SOAP server is brought up (using express to handle network requests) -- it's told where to listen (`/wsdl` by default), the WSDL file it should abide by (`SONOS_WSDL_FILE`), and the service it should host (`SONOS_SOAP_SERVICE`)
2. A set of non-SOAP endpoints are exposed through express (outside of SOAP). These are part of the Sonos Cloud Queue API and used for reporting progress from the player to the server (which is used to sync with Audiobookshelf)

## How to use

### Prerequisites

- A set of Sonos speakers
  - You'll need the IP address of one of the speakers
- The latest version of the Sonos mobile app
- Audiobookshelf running and accesssible
- A domain/URI configured to point at this server (with a valid HTTPS certificate)
  - At least for any modern version of Android, non-HTTPS requests signed by a cert in the CA-chain android already has fails. I have a reverse proxy set up to point to my `SOAP_URI` on `HTTP_PORT` for this with a cert configured on it.

### Step 1: Configuring a Custom Service Descriptor (CSD)

1. Browse to `http://<SONOS_SPEAKER_IP>:1400/customsd.htm`
2. Input the following information:
   - Service Name: audiobookshelf
   - Endpoint URL: `http://<the_url_you_defined_for_this_server_above>/wsdl`
   - Secure Endpoint URL: `https://<the_url_you_defined_for_this_server_above>/wsdl`
   - Polling interval: 10
   - Authentication SOAP header policy: Anonymous
   - Manifest
     - Version: 1.0
     - URI: `https:<the_url_you_defined_for_this_server_above>/manifest`
   - Support manifest file: original instructions said to check this box, I couldn't add the service if I did. YMMV
3. Submit (sometimes this randomly fails, and you need to go back and try again). You should see "Success" if it worked.
4. Add the new service to the Sonos mobile app
   - Settings -> Services + Voice -> Search for your new service -> "Add to Sonos" -> "Set up audiobookshelf
5. `audiobookshelf` should now be listed as a service in the "Browse" tab

### Step 2: Setting up your Audiobookshelf Sonos Server

1. Clone / download and enter the directory containing this repo
   - `git clone git@github.com:jt196/audiobookshelf-sonos.git && cd audiobookshelf-sonos`
2. Edit `.env.template` to match your necessary settings. A few minor things to note:
   - `SOAP_URI`: This is the URL part of the `Endpoint URL` and `Secure Endpoint URL` defined in the CSD earlier -- the URL where this server will be accessible from

```
SOAP_URI=<url_of_the_soap_server>
ABS_URI=<your_abs_url>
ABS_LIBRARY_ID=<abs_library_id>
ABS_TOKEN=<abs_api_token>
```

3. Copy the .env.template file to a .env file: `cp .env.template .env`

4. Update the `sonos.wsdl` file (line 2062) with your SOAP_URI

```
    <wsdl:service name="Sonos">
        <wsdl:port name="SonosSoap" binding="tns:SonosSoap">
		<soap:address location=""/> <!-- Update with SOAP_URI -->
        </wsdl:port>
    </wsdl:service>
```

### Step 3: Start the server and enjoy

1. Install the node packages: `npm i`
2. Install nodemon globally: `npm install -g nodemon`
3. `nodemon soap-server.js`
4. Open the Sonos mobile app and select audiobookshelf
5. This is where my progress stops
6. Select a book to listen to
7. If there is already progress on the book, it should start from where Audiobookshelf left off
   - Otherwise it will start from the beginning
