"""Authenticated proxy for the hosted certificate generator service."""

from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated


FORWARDED_RESPONSE_HEADERS = (
    'Content-Disposition',
    'Content-Length',
    'ETag',
    'Last-Modified',
    'Cache-Control',
    'X-Generated-Count',
    'X-Generation-Error-Count',
)


@api_view(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
@permission_classes([IsAuthenticated])
def certificate_generator_proxy(request, remote_path=''):
    clean_path = str(remote_path or '').lstrip('/')
    if not clean_path.startswith('api/'):
        return JsonResponse({'detail': 'Only certificate API paths may be proxied.'}, status=400)

    query = request.META.get('QUERY_STRING', '')
    target = f"{settings.CERTIFICATE_GENERATOR_API_URL}/{clean_path}"
    if query:
        target = f'{target}?{query}'

    headers = {'Accept': request.headers.get('Accept', '*/*')}
    content_type = request.headers.get('Content-Type')
    if content_type:
        headers['Content-Type'] = content_type

    upstream_request = Request(
        target,
        data=request.body if request.method not in {'GET', 'HEAD', 'OPTIONS'} else None,
        headers=headers,
        method=request.method,
    )

    try:
        with urlopen(upstream_request, timeout=240) as upstream:
            response = HttpResponse(
                upstream.read(),
                status=upstream.status,
                content_type=upstream.headers.get('Content-Type', 'application/octet-stream'),
            )
            for header in FORWARDED_RESPONSE_HEADERS:
                value = upstream.headers.get(header)
                if value:
                    response[header] = value
            return response
    except HTTPError as exc:
        return HttpResponse(
            exc.read(),
            status=exc.code,
            content_type=exc.headers.get('Content-Type', 'application/json'),
        )
    except (URLError, TimeoutError) as exc:
        return JsonResponse(
            {'detail': f'Certificate generator is unavailable: {getattr(exc, "reason", exc)}'},
            status=502,
        )
