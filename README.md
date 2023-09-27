Note by jt196:

> I've merged the original docs with mine. As of 27/09/23, I still can't get this to work, but hopefully I've made some progress into getting this working and someone else might have a breakthrough with the work I've done.
>
> The project should be a bit easier to test and debug now. I'd recommend not running it in a Docker container, until it's working, but it should work fine (with nodemon) in a container.

Differences between this and the original repo:

1. Runs using .env variables
2. Runs with nodemon, meaning changes you make are reloaded. If you share the files with a docker container, they'll immediately update rather than having to restart the container.
3. Improvements to the `buildLibraryMetadataResult()` function, returning correctly structured xml data.
   1. Album artwork url corrected
   2. Returns `mediaMetadata` not `mediaContent`
   3. Removed `libraryItem.media.audioFiles[0].mimeType`, `authorId: authorId`, `narratorId: narratorId` references which weren't in the ABS [API spec for library](https://api.audiobookshelf.org/#update-a-library-item-39-s-media).

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

# Testing

## SOAP Requests

Very useful to try these and make sure your server is returning the correct response.

Going to the url http://localhost/wsdl (or whatever your address is) will just return empty values. You need to send a POST request. Here's the setup I use in Postman/Thunderclient.

### getMetadata

- URL: http://localhost/wsdl
- Request type: POST
- Headers: "Content-Type": "text/xml"
- Body:

```XML
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
    <s:Header>
        <credentials xmlns="http://www.sonos.com/Services/1.1">
            <deviceId></deviceId>
            <deviceProvider></deviceProvider>
        </credentials>
    </s:Header>
    <s:Body>
        <getMetadata xmlns="http://www.sonos.com/Services/1.1">
            <id>root</id>
            <index>0</index>
            <count>100</count>
        </getMetadata>
    </s:Body>
</s:Envelope>
```

This should give you a response that is formatted like this:

```XML
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://www.sonos.com/Services/1.1" >
    <soap:Body>
        <getMetadataResponse xmlns="http://www.sonos.com/Services/1.1">
            <getMetadataResult>
                <count>707</count>
                <total>707</total>
                <index>0</index>
                <mediaMetadata>
                    <itemType>audiobook</itemType>
                    <id>70edd71c-0088-49b8-8ea5-210c8049ce09</id>
                    <canPlay>true</canPlay>
                    <canResume>true</canResume>
                    <title>The Good Shepherd</title>
                    <summary>The Good Shepherd is now a major motion picture, Greyhound , scripted by and starring Tom Hanks, directed by Aaron Schneider, and produced by Gary Goetzman. A convoy of 37 merchant ships is ploughing through icy, submarine-infested North Atlantic seas during the most critical days of World War II, when the German submarines had the upper hand and Allied shipping was suffering heavy losses. In charge is Commander George Krause, an untested veteran of the US Navy. Hounded by a wolf pack of German U-boats, he faces 48 hours of desperate peril trapped the bridge of the ship. Exhausted beyond measure, he must make countless and terrible decisions as he leads his small fighting force against the relentless U-boats.</summary>
                    <author>C.S. Forester</author>
                    <narrator>Edoardo Ballerini</narrator>
                    <albumArtURI>https://audiobooks.jamestorr.com/api/items/70edd71c-0088-49b8-8ea5-210c8049ce09/cover?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfdHN5bGNoeDB1MTM4MGU0bXA1IiwidXNlcm5hbWUiOiJqdDE5NiIsImlhdCI6MTY3NDMyMDQ0MH0.h7xzVwvrKN2FXmjuzCIcHf6GtCF7v0BhEpCWO1tLKo4</albumArtURI>
                </mediaMetadata>
            </getMetadataResult>
        </getMetadataResponse>
    </soap:Body>
</soap:Envelope>
```

## getLastUpdate

Sonos also needs access to this data apparently.
Use the same details as above but try this in the body:

```XML
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tns="http://www.sonos.com/Services/1.1">
    <soap:Header>
        <tns:credentials>
            <tns:zonePlayerId></tns:zonePlayerId>
            <tns:deviceId></tns:deviceId>
            <tns:deviceProvider></tns:deviceProvider>
            <tns:sessionId></tns:sessionId>
        </tns:credentials>
        <tns:context>
            <tns:timeZone></tns:timeZone>
        </tns:context>
    </soap:Header>
    <soap:Body>
        <tns:getLastUpdate/>
    </soap:Body>
</soap:Envelope>
```

I got this response:

```XML
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://www.sonos.com/Services/1.1">
    <soap:Body>
        <getLastUpdateResponse xmlns="http://www.sonos.com/Services/1.1">
            <getLastUpdateResult>
                <catalog>1695816021304</catalog>
                <autoRefreshEnabled>true</autoRefreshEnabled>
                <favorites>1695816021305</favorites>
                <pollInterval>10</pollInterval>
            </getLastUpdateResult>
        </getLastUpdateResponse>
    </soap:Body>
</soap:Envelope>
```

## Audiobookshelf

You can also request your library to check that you have all the details correctly entered.

- URL: <library_url>/api/libraries/<library_id>/items
  - e.g. https://audiobooks.example.com/api/libraries/87cfd553-cc5e-6a7b-1f23-123456eb62d7
- Request Type: GET
- Headers: "Authorization": "Bearer <your_ABS_TOKEN>"

# soapUI testing

You can download the Java app [here](https://www.soapui.org/downloads/)

The steps I went through to test were:

1. In soapUI > New Soap Project
2. Enter name
3. Browse to your _sonos.wsdl_ file for the wsdl file
4. Right click on the project and select _New Soap MockService_, name it.
5. Right click on the new mock service > New Operation
6. You'll need them for _getMetadata_ and _getLastUpdate_.
7. I pasted in the items from the requests above, alternatively you could try adding some of the basic ones from the SOAP Requests and Responses docs below.
8. Right click on the service > Start Minimized. Double click on the service in the pane on the right to maximize.
9. You should see some info in the SoapUI log on the bottom of the screen.
10. The port it uses is 8080, so I had to update the customsd page with the new URL.
11. If you add the new service, you should be able to see requests coming in in the service log.
12. Double click on the getMetadata > Response and you should also see the latest request.

# Documentation

## Sonos

Sonos docs aren't particularly well-optimized for SEO, so you have to dig around for them, but they're there.

I found these ones quite helpful:

- [Getting Started](https://devdocs.sonos.com/docs/content-service-get-started)
- [SOAP Requests and Responses](https://devdocs.sonos.com/docs/soap-requests-and-responses)
- [Test Your Service](https://devdocs.sonos.com/docs/test-your-service)
- [Content on Sonos](https://devdocs.sonos.com/docs/content-on-sonos)

- [Sonos forum](https://en.community.sonos.com)

## Stack Overflow

Some questions that might be useful

- [customSD does not show up](https://stackoverflow.com/questions/57281874/with-a-sonos-player-adding-local-service-to-customsd-does-not-show-up-music-ser)
- [Soap Server with Express](https://stackoverflow.com/questions/33062026/soap-server-with-express-js/38998377#38998377)

## Audiobookshelf

- [API docs for library](https://api.audiobookshelf.org/#update-a-library-item-39-s-media)

## NPM packages

- [Soap](https://www.npmjs.com/package/soap)
  - [GitHub](github.com/vpulim/node-soap)

## Misc

- [SoapUI](https://www.soapui.org/downloads)
